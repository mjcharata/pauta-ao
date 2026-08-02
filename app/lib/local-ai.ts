import metadata from "../data/local-ai-meta.json";

type TariffRecord = {
  code: string;
  description: string;
  unit: string;
  rate: string;
  page: number;
};

export type LocalClassification = {
  product: string;
  code: string;
  description: string;
  confidence: number;
  rationale: string;
  reviewRequired: boolean;
};

type LocalModel = {
  components: Int8Array;
  documents: Int8Array;
  vocabularyIndex: Map<string, number>;
};

const DOMAIN_HINTS: Array<{ pattern: RegExp; prefixes: string[]; boost: number }> = [
  { pattern: /\barroz\b/, prefixes: ["1006"], boost: 0.58 },
  { pattern: /\bsmartphones?\b/, prefixes: ["8517.13"], boost: 0.9 },
  { pattern: /\b(telemoveis?|smartphones?|telefones?)\b/, prefixes: ["8517"], boost: 0.62 },
  { pattern: /\b(paineis?\s+solares?|fotovoltaic\w*)\b/, prefixes: ["8541.43"], boost: 0.9 },
  { pattern: /\b(solar|solares|fotovoltaic\w*|paineis?)\b/, prefixes: ["8541"], boost: 0.62 },
  { pattern: /\bcimentos?\b/, prefixes: ["2523"], boost: 0.58 },
  { pattern: /\b(computadores?\s+portateis?|laptops?)\b/, prefixes: ["8471.30"], boost: 0.9 },
  { pattern: /\b(computadores?|portateis?|laptops?)\b/, prefixes: ["8471"], boost: 0.78 },
  { pattern: /\b(pneus?|pneumaticos?).*\b(novos?|automoveis?|passageiros?)\b/, prefixes: ["4011.10"], boost: 0.88 },
  { pattern: /\b(pneus?|pneumaticos?).*\b(camioes?|autocarros?)\b/, prefixes: ["4011.20"], boost: 0.88 },
  { pattern: /\b(pneus?|pneumaticos?)\b/, prefixes: ["4011"], boost: 0.64 },
  { pattern: /\b(automoveis?|carros?|viaturas?)\b/, prefixes: ["8703"], boost: 0.48 },
  { pattern: /\bcervejas?\b/, prefixes: ["2203"], boost: 0.58 },
  { pattern: /\bvinhos?\b/, prefixes: ["2204"], boost: 0.58 },
  { pattern: /\b(medicamentos?|farmacos?)\b/, prefixes: ["3004"], boost: 0.58 },
  { pattern: /\bcamisas?.*\b(homem|homens|masculin\w*)\b/, prefixes: ["6105", "6205"], boost: 0.88 },
  { pattern: /\bcamisas?.*\b(mulher|mulheres|feminin\w*)\b/, prefixes: ["6106", "6206"], boost: 0.88 },
  { pattern: /\bcamisas?\b/, prefixes: ["6105", "6106", "6205", "6206"], boost: 0.62 },
  { pattern: /\b(sapatos?|calcados?)\b/, prefixes: ["64"], boost: 0.58 },
  { pattern: /\bsoja\b/, prefixes: ["1507"], boost: 0.58 },
  { pattern: /\bpalma\b/, prefixes: ["1511"], boost: 0.58 },
  { pattern: /\bfarinha de trigo\b/, prefixes: ["1101"], boost: 0.58 },
];

let modelPromise: Promise<LocalModel> | null = null;

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}

function featureCounts(value: string) {
  const words = normalize(value).split(" ").filter((word) => word.length > 1);
  const counts = new Map<string, number>();
  const add = (feature: string) => counts.set(feature, (counts.get(feature) ?? 0) + 1);

  words.forEach((word) => {
    add(`w:${word}`);
    const padded = ` ${word} `;
    for (let size = 3; size <= 5; size += 1) {
      for (let start = 0; start <= padded.length - size; start += 1) {
        add(`c:${padded.slice(start, start + size)}`);
      }
    }
  });
  for (let index = 0; index < words.length - 1; index += 1) {
    add(`b:${words[index]}_${words[index + 1]}`);
  }
  return counts;
}

async function loadModel(): Promise<LocalModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const response = await fetch("/local-ai-model.bin");
      if (!response.ok) throw new Error("Modelo local indisponível");
      const bytes = new Int8Array(await response.arrayBuffer());
      const expectedBytes = metadata.componentBytes + metadata.records * metadata.dimensions;
      if (bytes.byteLength !== expectedBytes) throw new Error("Modelo local inválido");
      return {
        components: bytes.subarray(0, metadata.componentBytes),
        documents: bytes.subarray(metadata.componentBytes),
        vocabularyIndex: new Map(metadata.vocabulary.map((feature, index) => [feature, index])),
      };
    })();
  }
  return modelPromise;
}

function projectQuery(value: string, model: LocalModel) {
  const sparse: Array<{ index: number; value: number }> = [];
  let tfidfNorm = 0;
  featureCounts(value).forEach((count, feature) => {
    const index = model.vocabularyIndex.get(feature);
    if (index === undefined) return;
    const weight = (1 + Math.log(count)) * metadata.idf[index];
    sparse.push({ index, value: weight });
    tfidfNorm += weight * weight;
  });
  if (!sparse.length) return null;

  tfidfNorm = Math.sqrt(tfidfNorm);
  const vector = new Float32Array(metadata.dimensions);
  for (let dimension = 0; dimension < metadata.dimensions; dimension += 1) {
    const offset = dimension * metadata.features;
    let sum = 0;
    sparse.forEach((item) => {
      sum += (item.value / tfidfNorm) * model.components[offset + item.index] * metadata.componentScales[dimension];
    });
    vector[dimension] = sum;
  }

  let norm = 0;
  vector.forEach((item) => { norm += item * item; });
  norm = Math.sqrt(norm);
  if (!norm) return null;
  vector.forEach((item, index) => { vector[index] = item / norm; });
  return vector;
}

function lexicalSimilarity(tokens: string[], total: number, target: string) {
  if (!tokens.length) return 0;
  const matched = tokens.reduce(
    (sum, token) => sum + (target.includes(token) ? Math.min(token.length, 9) : 0),
    0,
  );
  return total ? matched / total : 0;
}

function hintBoost(normalized: string, code: string) {
  return DOMAIN_HINTS.reduce(
    (best, hint) => hint.pattern.test(normalized) && hint.prefixes.some((prefix) => code.startsWith(prefix))
      ? Math.max(best, hint.boost)
      : best,
    0,
  );
}

function classifyOne(
  product: string,
  records: TariffRecord[],
  normalizedDescriptions: string[],
  model: LocalModel,
): LocalClassification {
  const query = projectQuery(product, model);
  const normalizedProduct = normalize(product);
  const productTokens = normalizedProduct.split(" ").filter((token) => token.length > 2);
  const tokenWeight = productTokens.reduce((sum, token) => sum + Math.min(token.length, 9), 0);
  const compactCode = product.replace(/\D/g, "");
  let best = { index: 0, score: -Infinity, semantic: 0, lexical: 0 };
  let secondScore = -Infinity;

  records.forEach((record, index) => {
    let semantic = 0;
    if (query) {
      const offset = index * metadata.dimensions;
      for (let dimension = 0; dimension < metadata.dimensions; dimension += 1) {
        semantic += query[dimension] * model.documents[offset + dimension] * metadata.documentScale;
      }
    }
    const lexical = lexicalSimilarity(productTokens, tokenWeight, normalizedDescriptions[index]);
    const exactCode = compactCode.length >= 6 && record.code.replace(/\D/g, "").includes(compactCode) ? 1.2 : 0;
    const score = semantic * 0.78 + lexical * 0.28 + hintBoost(normalizedProduct, record.code) + exactCode;
    if (score > best.score) {
      secondScore = best.score;
      best = { index, score, semantic, lexical };
    } else if (score > secondScore) {
      secondScore = score;
    }
  });

  const record = records[best.index];
  const margin = Math.max(0, best.score - secondScore);
  const confidence = Math.round(Math.max(48, Math.min(94,
    50 + Math.max(0, best.semantic) * 29 + best.lexical * 10 + Math.min(10, margin * 38),
  )));
  return {
    product,
    code: record.code,
    description: record.description,
    confidence,
    rationale: "Semelhança semântica calculada localmente entre o produto e a nomenclatura pautal, sem envio de dados para serviços externos.",
    reviewRequired: confidence < 80,
  };
}

export async function classifyWithLocalAI(
  products: string[],
  records: TariffRecord[],
  onProgress?: (completed: number, total: number) => void,
) {
  if (records.length !== metadata.records) throw new Error("A base pautal e o modelo local não coincidem");
  const model = await loadModel();
  const normalizedDescriptions = records.map((record) => normalize(record.description));
  const results: LocalClassification[] = [];
  for (let index = 0; index < products.length; index += 1) {
    results.push(classifyOne(products[index], records, normalizedDescriptions, model));
    onProgress?.(index + 1, products.length);
    if (index % 4 === 3) await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
  return results;
}

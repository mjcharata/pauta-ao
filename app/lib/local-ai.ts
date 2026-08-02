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

type DomainHint = {
  pattern: RegExp;
  prefixes: string[];
  boost: number;
  label: string;
};

const DOMAIN_HINTS: DomainHint[] = [
  { pattern: /\barroz.*\b(semibranqueado|branqueado|polido)\b/, prefixes: ["1006.30"], boost: 0.94, label: "tipo de arroz" },
  { pattern: /\barroz\b/, prefixes: ["1006"], boost: 0.66, label: "cereal" },
  { pattern: /\bfarinha de trigo\b/, prefixes: ["1101"], boost: 0.9, label: "farinha de trigo" },
  { pattern: /\b(cafe|grao(?:s)? de cafe)\b/, prefixes: ["0901"], boost: 0.72, label: "café" },
  { pattern: /\bcha\b/, prefixes: ["0902"], boost: 0.72, label: "chá" },
  { pattern: /\bsmartphones?\b/, prefixes: ["8517.13"], boost: 0.96, label: "telefone inteligente" },
  { pattern: /\b(telemovel|telemoveis|celulares?|telefones?)\b/, prefixes: ["8517"], boost: 0.68, label: "telefonia" },
  { pattern: /\b(painel|paineis) solares?|modulos? solares?|fotovoltaic\w*\b/, prefixes: ["8541.43"], boost: 0.96, label: "módulo fotovoltaico" },
  { pattern: /\b(computador(?:es)? portateis?|laptops?|notebooks?)\b/, prefixes: ["8471.30"], boost: 0.96, label: "computador portátil" },
  { pattern: /\b(computador(?:es)?|pcs?)\b/, prefixes: ["8471"], boost: 0.72, label: "equipamento informático" },
  { pattern: /\b(pneus?|pneumaticos?).*\b(camiao|camioes|caminhao|caminhoes|autocarros?|onibus)\b/, prefixes: ["4011.20"], boost: 0.94, label: "pneu para veículo pesado" },
  { pattern: /\b(pneus?|pneumaticos?).*\b(automovel|automoveis|passageiros?|ligeiros?)\b/, prefixes: ["4011.10"], boost: 0.94, label: "pneu para automóvel" },
  { pattern: /\b(pneus?|pneumaticos?)\b/, prefixes: ["4011"], boost: 0.68, label: "pneumático" },
  { pattern: /\b(motociclos?|motocicletas?|motorizadas?|motas?)\b.*\b(eletric\w*)\b/, prefixes: ["8711.60"], boost: 0.95, label: "motociclo eléctrico" },
  { pattern: /\b(motociclos?|motocicletas?|motorizadas?|motas?)\b/, prefixes: ["8711"], boost: 0.76, label: "motociclo" },
  { pattern: /\b(camiao|camioes|caminhao|caminhoes)\b/, prefixes: ["8704"], boost: 0.66, label: "veículo de mercadorias" },
  { pattern: /\b(automovel|automoveis|carros?|viaturas?)\b/, prefixes: ["8703"], boost: 0.58, label: "automóvel de passageiros" },
  { pattern: /\b(cervejas?)\b/, prefixes: ["2203"], boost: 0.76, label: "cerveja de malte" },
  { pattern: /\b(vinhos?|champanhes?)\b/, prefixes: ["2204"], boost: 0.74, label: "vinho" },
  { pattern: /\b(medicamentos?|farmacos?|comprimidos?|capsulas?)\b/, prefixes: ["3004"], boost: 0.7, label: "medicamento doseado" },
  { pattern: /\b(cimentos?).*\b(portland)\b/, prefixes: ["2523.21", "2523.29"], boost: 0.9, label: "cimento Portland" },
  { pattern: /\bcimentos?\b/, prefixes: ["2523"], boost: 0.66, label: "cimento" },
  { pattern: /\b(fraldas?|cueiros?)\b/, prefixes: ["9619.00.30"], boost: 0.96, label: "fralda" },
  { pattern: /\b(detergentes?).*\b(retalho|domestico|roupa|louca)\b/, prefixes: ["3402.50"], boost: 0.92, label: "detergente acondicionado" },
  { pattern: /\b(detergentes?)\b/, prefixes: ["3402"], boost: 0.7, label: "detergente" },
  { pattern: /\b(sabao|saboes|sabonetes?)\b/, prefixes: ["3401"], boost: 0.72, label: "sabão" },
  { pattern: /\b(garrafas?|garrafoes?|frascos?).*\b(plastic\w*)\b/, prefixes: ["3923.30"], boost: 0.94, label: "recipiente de plástico" },
  { pattern: /\b(baterias?|acumulador(?:es)?).*\b(carro|automovel|arranque)\b/, prefixes: ["8507.10"], boost: 0.95, label: "bateria de arranque" },
  { pattern: /\b(baterias?|acumulador(?:es)?)\b/, prefixes: ["8507"], boost: 0.7, label: "acumulador eléctrico" },
  { pattern: /\b(cabos?|fios?).*\b(eletric\w*|cobre|coaxial|fibra optica)\b/, prefixes: ["8544"], boost: 0.78, label: "condutor eléctrico" },
  { pattern: /\b(gerador(?:es)?|grupos? eletrogen\w*|grupos? electrogen\w*)\b/, prefixes: ["8502"], boost: 0.8, label: "grupo electrogéneo" },
  { pattern: /\b(ar condicionado|climatizador(?:es)?)\b/, prefixes: ["8415"], boost: 0.84, label: "ar condicionado" },
  { pattern: /\b(frigorificos?|geladeiras?|refrigerador(?:es)?)\b/, prefixes: ["8418"], boost: 0.8, label: "refrigerador" },
  { pattern: /\b(congelador(?:es)?|freezers?|arcas frigorificas?)\b/, prefixes: ["8418.30", "8418.40"], boost: 0.9, label: "congelador" },
  { pattern: /\b(maquinas? de lavar).*\b(roupa|lavandaria)\b/, prefixes: ["8450"], boost: 0.9, label: "máquina de lavar roupa" },
  { pattern: /\b(movel|moveis|mobilia).*\b(madeira).*\b(escritorio)\b/, prefixes: ["9403.30"], boost: 0.95, label: "móvel de escritório em madeira" },
  { pattern: /\b(movel|moveis|mobilia).*\b(madeira).*\b(cozinha)\b/, prefixes: ["9403.40"], boost: 0.95, label: "móvel de cozinha em madeira" },
  { pattern: /\b(movel|moveis|mobilia).*\b(madeira).*\b(quarto)\b/, prefixes: ["9403.50"], boost: 0.95, label: "móvel de quarto em madeira" },
  { pattern: /\b(movel|moveis|mobilia).*\b(madeira)\b/, prefixes: ["9403.60"], boost: 0.86, label: "móvel de madeira" },
  { pattern: /\bcamisas?.*\b(homem|homens|masculin\w*)\b/, prefixes: ["6105", "6205"], boost: 0.88, label: "camisa masculina" },
  { pattern: /\bcamisas?.*\b(mulher|mulheres|feminin\w*)\b/, prefixes: ["6106", "6206"], boost: 0.88, label: "camisa feminina" },
  { pattern: /\bcamisas?\b/, prefixes: ["6105", "6106", "6205", "6206"], boost: 0.64, label: "camisa" },
  { pattern: /\b(sapatos?|calcados?|tenis)\b/, prefixes: ["64"], boost: 0.66, label: "calçado" },
  { pattern: /\b(oleo).*\b(soja)\b/, prefixes: ["1507"], boost: 0.84, label: "óleo de soja" },
  { pattern: /\b(oleo).*\b(palma)\b/, prefixes: ["1511"], boost: 0.84, label: "óleo de palma" },
];

const QUERY_EXPANSIONS: Array<{ pattern: RegExp; terms: string }> = [
  { pattern: /\b(telemovel|telemoveis|celulares?)\b/, terms: "telefones aparelhos telefonicos" },
  { pattern: /\bsmartphones?\b/, terms: "telefones inteligentes" },
  { pattern: /\blaptops?|notebooks?\b/, terms: "maquinas automaticas processamento dados portateis" },
  { pattern: /\b(painel|paineis) solares?|modulos? solares?\b/, terms: "celulas fotovoltaicas montadas modulos paineis" },
  { pattern: /\bgeladeiras?|frigorificos?\b/, terms: "refrigeradores domesticos conservacao frio" },
  { pattern: /\bfreezers?|arcas frigorificas?\b/, terms: "congeladores conservacao frio" },
  { pattern: /\bgerador(?:es)?\b/, terms: "grupos electrogenos energia electrica" },
  { pattern: /\bbaterias? de carro\b/, terms: "acumuladores chumbo arranque motores pistao" },
  { pattern: /\bcabos? electricos?\b/, terms: "fios condutores electricos isolados" },
  { pattern: /\bfraldas?\b/, terms: "cueiros fraldas higiene" },
  { pattern: /\bdetergentes?\b/, terms: "preparacoes lavagem agentes superficie" },
  { pattern: /\bmotas?\b/, terms: "motocicletas ciclomotores" },
  { pattern: /\b(camiao|camioes|caminhao|caminhoes)\b/, terms: "veiculos transporte mercadorias" },
  { pattern: /\bcarros?|viaturas?\b/, terms: "automoveis veiculos transporte pessoas" },
];

const STOP_WORDS = new Set([
  "a", "as", "ao", "aos", "com", "da", "das", "de", "do", "dos", "e", "em",
  "para", "por", "sem", "um", "uma", "uns", "umas", "produto", "produtos", "marca",
  "modelo", "embalagem", "embalagens", "caixa", "caixas", "pacote", "pacotes", "kg",
]);

const ATTRIBUTE_SIGNALS: Array<{ query: RegExp; target: RegExp; bonus: number }> = [
  { query: /\balgodao\b/, target: /\balgodao\b/, bonus: 0.16 },
  { query: /\b(couro|pele)\b/, target: /\b(couro|pele)\b/, bonus: 0.14 },
  { query: /\bplastic\w*\b/, target: /\bplastic\w*\b/, bonus: 0.14 },
  { query: /\bmadeira\b/, target: /\bmadeira\b/, bonus: 0.14 },
  { query: /\bvidro\b/, target: /\bvidro\b/, bonus: 0.14 },
  { query: /\b(aluminio|aco|ferro|cobre)\b/, target: /\b(aluminio|aco|ferro|cobre)\b/, bonus: 0.13 },
  { query: /\b(eletric\w*)\b/, target: /\b(eletric\w*)\b/, bonus: 0.12 },
  { query: /\b(novo|novos|nova|novas)\b/, target: /\b(novo|novos|nova|novas)\b/, bonus: 0.1 },
  { query: /\b(usado|usados|usada|usadas)\b/, target: /\b(usado|usados|usada|usadas|outros)\b/, bonus: 0.1 },
  { query: /\b(congelad\w*)\b/, target: /\b(congelad\w*)\b/, bonus: 0.12 },
  { query: /\b(refrigerad\w*)\b/, target: /\b(refrigerad\w*)\b/, bonus: 0.12 },
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

function expandQuery(value: string) {
  const normalized = normalize(value);
  const additions = QUERY_EXPANSIONS
    .filter((expansion) => expansion.pattern.test(normalized))
    .map((expansion) => expansion.terms);
  return [normalized, ...additions].join(" ").trim();
}

function meaningfulTokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function featureCounts(value: string) {
  const words = meaningfulTokens(value);
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
  const targetTokens = new Set(meaningfulTokens(target));
  const matched = tokens.reduce((sum, token) => {
    const weight = Math.min(token.length, 9);
    if (targetTokens.has(token)) return sum + weight;
    const related = Array.from(targetTokens).some(
      (candidate) => candidate.length >= 5 && token.length >= 5 &&
        (candidate.startsWith(token) || token.startsWith(candidate)),
    );
    if (related) return sum + weight * 0.72;
    return target.includes(token) ? sum + weight * 0.42 : sum;
  }, 0);
  return total ? matched / total : 0;
}

function buildFamilyContexts(records: TariffRecord[], normalizedDescriptions: string[]) {
  const families = new Map<string, Map<string, number>>();
  records.forEach((record, index) => {
    const family = record.code.replace(/\D/g, "").slice(0, 4);
    const counts = families.get(family) ?? new Map<string, number>();
    meaningfulTokens(normalizedDescriptions[index]).forEach((token) => {
      if (!/^(outros?|outras?|tipo|parte|partes)$/.test(token)) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    });
    families.set(family, counts);
  });

  const summaries = new Map<string, string>();
  families.forEach((counts, family) => {
    const summary = Array.from(counts.entries())
      .sort((left, right) => {
        const rightScore = Math.min(right[1], 4) * Math.min(right[0].length, 10);
        const leftScore = Math.min(left[1], 4) * Math.min(left[0].length, 10);
        return rightScore - leftScore || right[0].localeCompare(left[0]);
      })
      .slice(0, 36)
      .map(([token]) => token)
      .join(" ");
    summaries.set(family, summary);
  });

  return records.map((record) => summaries.get(record.code.replace(/\D/g, "").slice(0, 4)) ?? "");
}

function hintMatch(normalized: string, code: string) {
  return DOMAIN_HINTS.reduce(
    (best, hint) => hint.pattern.test(normalized) && hint.prefixes.some((prefix) => code.startsWith(prefix)) && hint.boost > best.boost
      ? { boost: hint.boost, label: hint.label }
      : best,
    { boost: 0, label: "" },
  );
}

function strongestQueryHint(normalized: string) {
  return DOMAIN_HINTS.reduce<DomainHint | null>(
    (best, hint) => hint.pattern.test(normalized) && (!best || hint.boost > best.boost) ? hint : best,
    null,
  );
}

function attributeBoost(normalizedProduct: string, normalizedDescription: string) {
  return Math.min(0.34, ATTRIBUTE_SIGNALS.reduce(
    (score, signal) => signal.query.test(normalizedProduct) && signal.target.test(normalizedDescription)
      ? score + signal.bonus
      : score,
    0,
  ));
}

function classifyOne(
  product: string,
  records: TariffRecord[],
  normalizedDescriptions: string[],
  familyContexts: string[],
  model: LocalModel,
): LocalClassification {
  const normalizedProduct = normalize(product);
  const expandedProduct = expandQuery(product);
  const query = projectQuery(expandedProduct, model);
  const primaryHint = strongestQueryHint(normalizedProduct);
  const productTokens = meaningfulTokens(expandedProduct).filter((token) => token.length > 2);
  const tokenWeight = productTokens.reduce((sum, token) => sum + Math.min(token.length, 9), 0);
  const compactCode = product.replace(/\D/g, "");
  let best = {
    index: 0,
    score: -Infinity,
    semantic: 0,
    lexical: 0,
    familyLexical: 0,
    hint: 0,
    hintLabel: "",
    attributes: 0,
    exactCode: 0,
    generic: false,
  };
  let secondScore = -Infinity;

  records.forEach((record, index) => {
    let semantic = 0;
    if (query) {
      const offset = index * metadata.dimensions;
      for (let dimension = 0; dimension < metadata.dimensions; dimension += 1) {
        semantic += query[dimension] * model.documents[offset + dimension] * metadata.documentScale;
      }
    }
    const normalizedDescription = normalizedDescriptions[index];
    const lexical = lexicalSimilarity(productTokens, tokenWeight, normalizedDescription);
    const familyLexical = lexicalSimilarity(productTokens, tokenWeight, familyContexts[index]);
    const hint = hintMatch(normalizedProduct, record.code);
    const categoryConflict = primaryHint && primaryHint.boost >= 0.85 &&
      !primaryHint.prefixes.some((prefix) => record.code.startsWith(prefix)) ? 0.42 : 0;
    const attributes = attributeBoost(normalizedProduct, normalizedDescription);
    const exactPhrase = normalizedProduct.length >= 5 && normalizedDescription.includes(normalizedProduct) ? 0.16 : 0;
    const recordCode = record.code.replace(/\D/g, "");
    const exactCode = compactCode.length >= 6 && recordCode.includes(compactCode)
      ? compactCode.length >= 8 ? 1.45 : 1.12
      : 0;
    const generic = /^(outros?|outras?|designacao nao legivel)/.test(normalizedDescription);
    const score = semantic * 0.72 + lexical * 0.4 + familyLexical * 0.13 +
      hint.boost + attributes + exactPhrase + exactCode - categoryConflict - (generic ? 0.04 : 0);
    if (score > best.score) {
      secondScore = best.score;
      best = {
        index,
        score,
        semantic,
        lexical,
        familyLexical,
        hint: hint.boost,
        hintLabel: hint.label,
        attributes,
        exactCode,
        generic,
      };
    } else if (score > secondScore) {
      secondScore = score;
    }
  });

  const record = records[best.index];
  const margin = Math.max(0, best.score - secondScore);
  const rawConfidence = 44 + Math.max(0, best.semantic) * 24 + best.lexical * 19 +
    best.familyLexical * 7 + best.hint * 24 + best.attributes * 30 +
    Math.min(11, best.exactCode * 10) + Math.min(10, margin * 30) - (best.generic ? 7 : 0);
  const confidence = Math.round(Math.max(45, Math.min(97, rawConfidence)));
  const signals = [
    best.exactCode > 0 ? "o código indicado no texto" : "",
    best.hintLabel ? `a categoria comercial (${best.hintLabel})` : "",
    best.attributes >= 0.1 ? "o material e as características declaradas" : "",
    best.lexical >= 0.35 ? "os termos da descrição" : "",
    best.semantic > 0 ? "a proximidade semântica com a pauta" : "",
  ].filter(Boolean);
  const rationale = `Proposta baseada em ${signals.slice(0, 3).join(", ") || "comparação semântica e lexical"}. Análise executada localmente, sem enviar a lista para serviços externos.`;
  const closeAlternative = margin < 0.035 && best.exactCode === 0 && best.hint < 0.9;
  return {
    product,
    code: record.code,
    description: record.description,
    confidence,
    rationale,
    reviewRequired: confidence < 82 || closeAlternative || best.generic,
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
  const familyContexts = buildFamilyContexts(records, normalizedDescriptions);
  const results: LocalClassification[] = [];
  for (let index = 0; index < products.length; index += 1) {
    results.push(classifyOne(products[index], records, normalizedDescriptions, familyContexts, model));
    onProgress?.(index + 1, products.length);
    if (index % 4 === 3) await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
  return results;
}

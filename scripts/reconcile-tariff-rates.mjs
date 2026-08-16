import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../app/data/pauta.json", import.meta.url);
const OCR_PATH = new URL("../work/tariff-audit/extracted-rates.json", import.meta.url);
const META_PATH = new URL("../app/data/local-ai-meta.json", import.meta.url);
const MODEL_PATH = new URL("../public/local-ai-model.bin", import.meta.url);
const PDF_PATH = new URL("../public/pauta-aduaneira-angola-2024.pdf", import.meta.url);
const AUDIT_PATH = new URL("../app/data/tariff-audit.json", import.meta.url);
const OUTPUT_DIR = new URL("../outputs/", import.meta.url);

const EXPECTED_INPUT_RECORDS = 6056;
const VALID_BASE_RATES = new Set(["Livre", "0", "2", "5", "10", "15", "20", "25", "30", "35", "40", "50", "55"]);
const VALID_EFFECTIVE_RATES = new Set(["Livre", "0", "5", "10", "15", "20", "25", "30", "35", "40", "50", "55"]);

// These rows were created by OCR fragments, headings treated as tariff
// positions, or duplicate mistyped codes.  Each was checked against the
// printed page; none is a declarable tariff line in the official PDF.
const GHOST_CODES = new Set([
  "1223.00.00",
  "1808.52.00",
  "2027.90.00",
  "3405.50.00",
  "4002.43.00",
  "4811.50.00",
  "4814.50.00",
  "7326.90.90",
  "7404.90.00",
  "7908.90.00",
  "8499.10.00",
  "8703.23.90",
  "9304.10.00",
]);

// Rows whose R.G. cell was reviewed directly in the 300 dpi page image.
const REVIEWED_BASE_RATES = new Map([
  ["0302.11.00", "20"],
  ["2207.10.00", "55"],
  ["6603.20.00", "5"],
  ["8608.00.00", "Livre"],
  ["8703.70.00", "10"],
  ["8708.94.90", "0"],
  ["9603.10.00", "10"],
]);

// The legacy import assigned these exact codes to unrelated pages.  Exact
// code matches on the listed PDF pages were visually confirmed.
const REVIEWED_OFF_PAGE = new Set([
  "1006.30.00",
  "2203.00.00",
  "2523.29.00",
  "3926.90.90",
  "6109.10.00",
  "6403.99.00",
]);

// Known low-confidence OCR exceptions.  Their printed values were reviewed
// and the existing numeric value is correct.
const KEEP_EXISTING_RATE = new Set([
  "0302.51.00",
  "0302.71.00",
  "0305.20.00",
  "7112.30.00",
  "8539.21.90",
  "8539.29.00",
  "9404.21.00",
  "9404.40.00",
  "9506.31.00",
]);

function effective2026Rate(baseRate) {
  if (baseRate === "0" || baseRate === "2") return "5";
  return baseRate;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const [dataText, ocrText, metaText, model, pdf] = await Promise.all([
  readFile(DATA_PATH, "utf8"),
  readFile(OCR_PATH, "utf8"),
  readFile(META_PATH, "utf8"),
  readFile(MODEL_PATH),
  readFile(PDF_PATH),
]);

const input = JSON.parse(dataText);
const ocr = JSON.parse(ocrText);
const metadata = JSON.parse(metaText);

if (input.length !== EXPECTED_INPUT_RECORDS || metadata.records !== EXPECTED_INPUT_RECORDS) {
  throw new Error(`Expected the original ${EXPECTED_INPUT_RECORDS}-record dataset and aligned model.`);
}

const removedIndexes = [];
const changes = [];
const records = [];
let filledMissing = 0;
let filledMissingWithDuty = 0;
let correctedFalseFree = 0;
let numericCorrections = 0;
let article31Floor = 0;

for (const [index, original] of input.entries()) {
  if (GHOST_CODES.has(original.code)) {
    removedIndexes.push(index);
    changes.push({
      code: original.code,
      description: original.description,
      before: original.rate,
      official2024: "",
      after: "REMOVIDO",
      reason: "Registo OCR inválido, duplicado ou cabeçalho sem posição pautal",
    });
    continue;
  }

  const record = { ...original };
  const previousRate = record.rate;

  // Explicit OGE Annex III records always win over the 2024 base tariff.
  if (record.source !== "OGE 2026" && !record.rateSource) {
    const candidate = ocr[record.code];
    let baseRate = REVIEWED_BASE_RATES.get(record.code);
    let reason = baseRate ? "Revisão visual da célula R.G. no PDF" : "";

    if (!baseRate && candidate?.rate && VALID_BASE_RATES.has(candidate.rate)) {
      if (previousRate === "—" || previousRate === "Livre") {
        baseRate = candidate.rate;
        reason = "Extracção 300 dpi da célula R.G.";
      } else if (
        candidate.rate !== previousRate
        && !KEEP_EXISTING_RATE.has(record.code)
        && Number(candidate.rateConfidence ?? 0) >= 30
        && (candidate.page === record.page || REVIEWED_OFF_PAGE.has(record.code))
      ) {
        baseRate = candidate.rate;
        reason = "Divergência numérica confirmada na pauta oficial";
      }
    }

    if (!baseRate) baseRate = previousRate;
    if (!VALID_BASE_RATES.has(baseRate) || baseRate === "—") {
      throw new Error(`Unresolved R.G. rate for ${record.code}: ${baseRate}`);
    }

    if (REVIEWED_OFF_PAGE.has(record.code) && candidate?.page) {
      record.page = candidate.page;
    }

    const effectiveRate = effective2026Rate(baseRate);
    record.rate = effectiveRate;
    if (effectiveRate !== baseRate) {
      record.baseRate = baseRate;
      record.rateSource = "Lei n.º 14/25 · Artigo 31.º, n.º 3";
      article31Floor += 1;
      reason = `${reason ? `${reason}; ` : ""}taxa mínima de 5% do OGE 2026`;
    }

    if (previousRate === "—") {
      filledMissing += 1;
      if (effectiveRate !== "Livre") filledMissingWithDuty += 1;
    }
    if (previousRate === "Livre" && effectiveRate !== "Livre") correctedFalseFree += 1;
    if (!['—', 'Livre'].includes(previousRate) && previousRate !== effectiveRate) numericCorrections += 1;

    if (previousRate !== effectiveRate) {
      changes.push({
        code: record.code,
        description: record.description,
        before: previousRate,
        official2024: baseRate,
        after: effectiveRate,
        reason,
      });
    }
  }

  if (!VALID_EFFECTIVE_RATES.has(record.rate)) {
    throw new Error(`Invalid effective rate for ${record.code}: ${record.rate}`);
  }
  records.push(record);
}

const codes = new Set(records.map((record) => record.code));
if (codes.size !== records.length) throw new Error("Duplicate tariff codes remain after reconciliation.");
if (records.some((record) => record.rate === "—")) throw new Error("Unresolved tariff rates remain.");
if (removedIndexes.length !== GHOST_CODES.size) throw new Error("Not every reviewed ghost record was removed.");

const expectedModelBytes = metadata.componentBytes + metadata.records * metadata.dimensions;
if (model.byteLength !== expectedModelBytes) throw new Error("The local AI model is not aligned with the input dataset.");
const removedSet = new Set(removedIndexes);
const modelRows = [];
for (let index = 0; index < input.length; index += 1) {
  if (removedSet.has(index)) continue;
  const start = metadata.componentBytes + index * metadata.dimensions;
  modelRows.push(model.subarray(start, start + metadata.dimensions));
}
const alignedModel = Buffer.concat([model.subarray(0, metadata.componentBytes), ...modelRows]);
metadata.records = records.length;

const distribution = Object.fromEntries(
  [...new Set(records.map((record) => record.rate))]
    .sort((left, right) => left === "Livre" ? -1 : right === "Livre" ? 1 : Number(left) - Number(right))
    .map((rate) => [rate, records.filter((record) => record.rate === rate).length]),
);
const annexOverrides = records.filter((record) => record.rateSource === "Lei n.º 14/25 · Anexo III").length;
const audit = {
  generatedAt: "2026-08-16",
  methodology: "OCR 300 dpi, exact-code row alignment, isolated low-confidence cell reread, and manual review of exceptions",
  source: {
    document: "Pauta Aduaneira 2024 — Diário da República, I Série, n.º 2, de 3 de Janeiro de 2024",
    pages: 345,
    sha256: createHash("sha256").update(pdf).digest("hex").toUpperCase(),
  },
  recordsBefore: input.length,
  recordsAfter: records.length,
  baseRecordsAfter: records.filter((record) => record.source !== "OGE 2026").length,
  oge2026NewRecords: records.filter((record) => record.source === "OGE 2026").length,
  annexOverridesPreserved: annexOverrides,
  ocr: {
    matchedCodes: Object.keys(ocr).length,
    extractedRates: Object.values(ocr).filter((item) => item.rate).length,
  },
  corrections: {
    removedGhostRecords: removedIndexes.length,
    filledPreviouslyMissing: filledMissing,
    filledPreviouslyMissingWithDuty: filledMissingWithDuty,
    correctedFalseFree,
    numericCorrections,
    article31MinimumApplied: article31Floor,
    totalChangedOrRemoved: changes.length,
  },
  distribution,
  validation: {
    uniqueCodes: codes.size === records.length,
    unresolvedRates: records.filter((record) => record.rate === "—").length,
    allowedRatesOnly: records.every((record) => VALID_EFFECTIVE_RATES.has(record.rate)),
    localAiRecords: records.length,
  },
};

const csvHeaders = ["Código", "Designação", "Antes", "R.G. 2024", "R.G. 2026", "Motivo"];
const csvRows = changes.map((change) => [
  change.code,
  change.description,
  change.before,
  change.official2024,
  change.after,
  change.reason,
]);
const csv = [csvHeaders, ...csvRows].map((row) => row.map(escapeCsv).join(",")).join("\r\n") + "\r\n";

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(DATA_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf8"),
  writeFile(META_PATH, JSON.stringify(metadata), "utf8"),
  writeFile(MODEL_PATH, alignedModel),
  writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
  writeFile(new URL("auditoria-alteracoes-taxas.csv", OUTPUT_DIR), `\uFEFF${csv}`, "utf8"),
]);

console.log(JSON.stringify(audit, null, 2));

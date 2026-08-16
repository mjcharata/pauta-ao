import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the customs tariff experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Pauta AO/);
  assert.match(html, /Encontre o código certo/);
  assert.match(html, /Exportar para Excel/);
  assert.match(html, /Descarregar PDF oficial/);
  assert.match(html, /pauta-aduaneira-angola-2024\.pdf/);
  assert.match(html, /Pesquisa com IA/);
  assert.match(html, /Simulador de viaturas/);
  assert.match(html, /Calcule os custos da sua viatura/);
  assert.match(html, /class="vehicle-hero-mark" aria-hidden="true"><\/span>/);
  assert.match(html, /NOVA, usada ou eléctrica/i);
  assert.match(html, /class="search-submit">Pesquisar/);
  assert.match(html, /OGE 2026/);
  assert.match(html, /Exclusivo para Angola/);
  assert.match(html, /angola-flag\.svg/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("includes the 2026 vehicle import simulator and its legal safeguards", async () => {
  const [pageSource, simulatorSource, exchangeRoute, vehicleImage] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/vehicle-simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/exchange/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/vehicle-showcase.jpg", import.meta.url)),
  ]);
  assert.match(pageSource, /VehicleSimulator/);
  assert.match(pageSource, /Simulador de viaturas/);
  assert.match(simulatorSource, /Viaturas terrestres/);
  assert.match(simulatorSource, /Embarcações/);
  assert.match(simulatorSource, /Aeronaves/);
  assert.match(simulatorSource, /Imposto Especial de Consumo/);
  assert.match(simulatorSource, /Emolumentos Gerais Aduaneiros/);
  assert.match(simulatorSource, /vatBase \* 0\.14/);
  assert.match(simulatorSource, /tariffDutyRate \* 0\.5/);
  assert.match(simulatorSource, /Lei n\.º 16\/21/);
  assert.match(simulatorSource, /Lei n\.º 8\/22/);
  assert.match(simulatorSource, /DP n\.º 155\/20/);
  assert.match(simulatorSource, /Não inclui despachante/i);
  assert.match(simulatorSource, /EXCHANGE_SPREAD = 0\.09/);
  assert.match(simulatorSource, /Conversor oficial de moedas · BNA/);
  assert.match(simulatorSource, /Lexus LX 600/);
  assert.match(simulatorSource, /BMW R 1200 GS/);
  assert.match(simulatorSource, /Crédito automóvel/);
  assert.match(simulatorSource, /CREDIT_ANNUAL_RATE = 0\.25/);
  assert.match(simulatorSource, /CREDIT_MAX_MONTHS = 60/);
  assert.match(simulatorSource, /appliedAnnualRate \/ 12/);
  assert.match(simulatorSource, /Valor residual/);
  assert.match(simulatorSource, /Imprimir simulação completa/);
  assert.match(simulatorSource, /Editar capital/);
  assert.match(simulatorSource, /Editar taxa/);
  assert.match(simulatorSource, /Simulação mensal detalhada/);
  assert.match(simulatorSource, /Saldo inicial/);
  assert.match(simulatorSource, /Capital/);
  assert.match(simulatorSource, /Juros/);
  assert.match(simulatorSource, /CUSTO FINAL PARA A EMPRESA/);
  assert.match(simulatorSource, /Array\.from\(\{ length: loanTermMonths \}/);
  assert.equal(vehicleImage.subarray(0, 2).toString("hex"), "ffd8");
  assert.ok(vehicleImage.byteLength > 100_000);
  assert.match(exchangeRoute, /www\.bna\.ao\/service\/rest\/taxas\/conversor\/moeda/);
  assert.match(exchangeRoute, /tipoCambio\?\.toUpperCase\(\) === "G"/);
});

test("packages the complete official source PDF", async () => {
  const pdf = await readFile(new URL("../public/pauta-aduaneira-angola-2024.pdf", import.meta.url));
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.equal(pdf.byteLength, 20514916);
});

test("packages the Sites hosting metadata with the production build", async () => {
  const source = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
  const packaged = JSON.parse(await readFile(new URL("../dist/.openai/hosting.json", import.meta.url), "utf8"));
  assert.deepEqual(packaged, source);
});

test("keeps the local AI model aligned with the tariff database", async () => {
  const [metadataText, tariffText, auditText, model, pageSource] = await Promise.all([
    readFile(new URL("../app/data/local-ai-meta.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/pauta.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/tariff-audit.json", import.meta.url), "utf8"),
    readFile(new URL("../public/local-ai-model.bin", import.meta.url)),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const metadata = JSON.parse(metadataText);
  const tariff = JSON.parse(tariffText);
  const audit = JSON.parse(auditText);
  assert.equal(metadata.records, tariff.length);
  assert.equal(new Set(tariff.map((item) => item.code)).size, tariff.length);
  assert.equal(tariff.length, audit.recordsAfter);
  assert.equal(tariff.length, 6043);
  assert.equal(model.byteLength, metadata.componentBytes + metadata.records * metadata.dimensions);
  assert.match(pageSource, /IA local gratuita/);
});

test("keeps the audited customs rates complete and correctly classified", async () => {
  const [tariffText, auditText, pdf, pageSource] = await Promise.all([
    readFile(new URL("../app/data/pauta.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/tariff-audit.json", import.meta.url), "utf8"),
    readFile(new URL("../public/pauta-aduaneira-angola-2024.pdf", import.meta.url)),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const tariff = JSON.parse(tariffText);
  const audit = JSON.parse(auditText);
  const byCode = new Map(tariff.map((item) => [item.code, item]));
  const expectedRates = {
    "0208.40.00": "55",
    "0208.50.00": "55",
    "0302.11.00": "20",
    "2207.10.00": "55",
    "2401.20.00": "55",
    "5007.10.00": "5",
    "6109.10.00": "40",
    "8485.90.00": "0",
    "8703.70.00": "10",
    "8708.94.90": "5",
    "9505.10.00": "5",
    "9603.10.00": "10",
  };
  const ghostCodes = [
    "1223.00.00", "1808.52.00", "2027.90.00", "3405.50.00",
    "4002.43.00", "4811.50.00", "4814.50.00", "7326.90.90",
    "7404.90.00", "7908.90.00", "8499.10.00", "8703.23.90",
    "9304.10.00",
  ];

  assert.equal(audit.validation.unresolvedRates, 0);
  assert.equal(audit.validation.allowedRatesOnly, true);
  assert.equal(audit.annexOverridesPreserved, 1099);
  assert.equal(audit.corrections.removedGhostRecords, ghostCodes.length);
  assert.equal(tariff.filter((item) => item.rateSource === "Lei n.º 14/25 · Anexo III").length, 1099);
  assert.ok(tariff.every((item) => item.rate && item.rate !== "—"));
  assert.equal(
    createHash("sha256").update(pdf).digest("hex").toUpperCase(),
    audit.source.sha256,
  );
  for (const [code, rate] of Object.entries(expectedRates)) {
    assert.equal(byCode.get(code)?.rate, rate, `incorrect audited rate for ${code}`);
  }
  for (const code of ghostCodes) assert.equal(byCode.has(code), false, `ghost code ${code} remains`);
  assert.equal(byCode.get("8708.94.90")?.baseRate, "0");
  assert.match(pageSource, /Regime R\.G\./);
  assert.match(pageSource, /Taxa R\.G\. \(%\)/);
});

test("configures the free Cloudflare Workers AI classifier", async () => {
  const [wranglerText, routeSource, pageSource] = await Promise.all([
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../app/api/classify/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const wrangler = JSON.parse(wranglerText);
  assert.deepEqual(wrangler.ai, { binding: "AI" });
  assert.match(routeSource, /@cf\/openai\/gpt-oss-20b/);
  assert.match(routeSource, /não conste|Não inventes códigos/);
  assert.match(routeSource, /choices\?\.\[0\]\?\.message\?\.content/);
  assert.match(pageSource, /Cloudflare AI gratuita/);
  assert.match(pageSource, /GPT-OSS 20B/);
  assert.match(pageSource, /useState<ClassifierEngine>\("workers-ai"\)/);
});

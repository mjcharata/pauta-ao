import assert from "node:assert/strict";
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
  assert.match(html, /NOVA, usada ou eléctrica/i);
  assert.match(html, /class="search-submit">Pesquisar/);
  assert.match(html, /OGE 2026/);
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
  assert.match(simulatorSource, /EXCHANGE_SPREAD = 0\.035/);
  assert.match(simulatorSource, /Conversor oficial de moedas · BNA/);
  assert.match(simulatorSource, /Lexus LX 600/);
  assert.match(simulatorSource, /BMW R 1200 GS/);
  assert.match(simulatorSource, /Crédito automóvel/);
  assert.match(simulatorSource, /CREDIT_ANNUAL_RATE = 0\.25/);
  assert.match(simulatorSource, /CREDIT_MAX_MONTHS = 60/);
  assert.match(simulatorSource, /CREDIT_ANNUAL_RATE \/ 12/);
  assert.match(simulatorSource, /Valor residual/);
  assert.match(simulatorSource, /Imprimir simulação completa/);
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

test("keeps the local AI model aligned with the tariff database", async () => {
  const [metadataText, tariffText, model, pageSource] = await Promise.all([
    readFile(new URL("../app/data/local-ai-meta.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/pauta.json", import.meta.url), "utf8"),
    readFile(new URL("../public/local-ai-model.bin", import.meta.url)),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const metadata = JSON.parse(metadataText);
  const tariff = JSON.parse(tariffText);
  assert.equal(metadata.records, tariff.length);
  assert.equal(new Set(tariff.map((item) => item.code)).size, tariff.length);
  assert.equal(tariff.length, 6056);
  assert.equal(model.byteLength, metadata.componentBytes + metadata.records * metadata.dimensions);
  assert.match(pageSource, /IA local gratuita/);
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

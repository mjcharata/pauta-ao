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
  assert.match(html, /Classificar lista/);
  assert.match(html, /OGE 2026/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
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
  assert.match(pageSource, /Cloudflare AI gratuita/);
  assert.match(pageSource, /GPT-OSS 20B/);
});

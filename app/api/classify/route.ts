import tariffData from "../../data/pauta.json";

type TariffRecord = { code: string; description: string; unit: string; rate: string; page: number };
const records = tariffData as TariffRecord[];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase();
}

function candidatesFor(product: string) {
  const tokens = normalize(product).split(" ").filter((token) => token.length > 2);
  return records
    .map((record) => ({
      ...record,
      score: tokens.reduce((score, token) => score + (normalize(record.description).includes(token) ? token.length : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score: _score, ...record }) => record);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OPENAI_API_KEY não configurada" }, { status: 503 });

  const body = (await request.json()) as { products?: unknown };
  const products = Array.isArray(body.products)
    ? body.products.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 50)
    : [];
  if (!products.length) return Response.json({ error: "Lista vazia" }, { status: 400 });

  const context = products.map((product) => ({ product, candidates: candidatesFor(product) }));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      reasoning: { effort: "none" },
      instructions: [
        "Função: especialista em classificação pautal de mercadorias para Angola.",
        "Objectivo: propor para cada produto exactamente um código entre os candidatos fornecidos.",
        "Critérios: considere matéria constitutiva, função, apresentação e grau de elaboração. Responda em português.",
        "Limites: não invente códigos; reduza a confiança e marque revisão quando a descrição for insuficiente. A proposta não é vinculativa.",
      ].join("\n"),
      input: JSON.stringify(context),
      text: {
        format: {
          type: "json_schema",
          name: "tariff_classifications",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    product: { type: "string" },
                    code: { type: "string" },
                    description: { type: "string" },
                    confidence: { type: "integer", minimum: 0, maximum: 100 },
                    rationale: { type: "string" },
                    reviewRequired: { type: "boolean" },
                  },
                  required: ["product", "code", "description", "confidence", "rationale", "reviewRequired"],
                },
              },
            },
            required: ["results"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return Response.json({ error: "Falha na classificação", detail: detail.slice(0, 500) }, { status: 502 });
  }

  const payload = (await response.json()) as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const outputText = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!outputText) return Response.json({ error: "Resposta sem conteúdo" }, { status: 502 });
  return Response.json(JSON.parse(outputText));
}

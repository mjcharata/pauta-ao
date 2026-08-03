const BNA_CONVERTER_URL = "https://www.bna.ao/service/rest/taxas/conversor/moeda";

type BnaQuote = {
  taxa?: number;
  tipoCambio?: string;
  descricaoTipoCambio?: string;
  data?: string;
  montanteConvertido?: number;
};

type BnaResponse = {
  genericResponse?: BnaQuote[];
  success?: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currency = (searchParams.get("currency") ?? "USD").trim().toUpperCase();

  if (!/^[A-Z]{3,6}$/.test(currency)) {
    return Response.json({ error: "Moeda inválida." }, { status: 400 });
  }

  if (currency === "AOA") {
    return Response.json({
      provider: "Banco Nacional de Angola",
      source: "https://www.bna.ao/",
      currency,
      target: "AOA",
      quoteType: "G",
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
    });
  }

  const params = new URLSearchParams({
    moedaOrigem: currency,
    moedaDestino: "AOA",
    montante: "1",
  });

  try {
    const response = await fetch(`${BNA_CONVERTER_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`BNA respondeu com ${response.status}`);

    const payload = (await response.json()) as BnaResponse;
    const quote = payload.genericResponse?.find((item) => item.tipoCambio?.toUpperCase() === "G");
    const rate = Number(quote?.taxa ?? quote?.montanteConvertido);

    if (!payload.success || !quote || !Number.isFinite(rate) || rate <= 0) {
      throw new Error("Cotação BNA indisponível");
    }

    return Response.json(
      {
        provider: "Banco Nacional de Angola",
        source: "https://www.bna.ao/",
        currency,
        target: "AOA",
        quoteType: "G",
        quoteDescription: quote.descricaoTipoCambio ?? "Taxa de Referência — Compra",
        rate,
        date: quote.data ?? null,
      },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json(
      {
        error: "Não foi possível obter a taxa oficial do BNA. Pode introduzir a taxa manualmente no simulador.",
        source: "https://www.bna.ao/",
      },
      { status: 502 },
    );
  }
}

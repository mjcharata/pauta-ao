"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import pautaRecords from "./data/pauta.json";
import VehicleSimulator from "./vehicle-simulator";

type TariffRecord = {
  code: string;
  description: string;
  unit: string;
  rate: string;
  page: number;
  source?: string;
  rateSource?: string;
  ogePage?: number;
};

type Classification = {
  product: string;
  code: string;
  description: string;
  confidence: number;
  rationale: string;
  reviewRequired: boolean;
};

type ClassifierEngine = "local-ai" | "workers-ai";
type ClassificationMode = "local-ai" | "local-fallback" | "workers-ai";

const records = pautaRecords as TariffRecord[];
const PAGE_SIZE = 11;
const DEFAULT_PRODUCTS = [
  "Arroz agulha semi-branqueado, embalagem de 25 kg",
  "Telemóvel smartphone 5G",
  "Painéis solares fotovoltaicos",
  "Cimento Portland cinzento em sacos",
].join("\n");

const CHAPTER_NAMES: Record<string, string> = {
  "01": "Animais vivos",
  "02": "Carnes e miudezas",
  "03": "Peixes e crustáceos",
  "04": "Leite, ovos e mel",
  "07": "Produtos hortícolas",
  "08": "Frutas",
  "09": "Café, chá e especiarias",
  "10": "Cereais",
  "15": "Gorduras e óleos",
  "22": "Bebidas",
  "25": "Sal, enxofre e cimento",
  "27": "Combustíveis minerais",
  "30": "Produtos farmacêuticos",
  "39": "Plásticos",
  "61": "Vestuário de malha",
  "62": "Vestuário, excepto malha",
  "64": "Calçado",
  "72": "Ferro e aço",
  "84": "Máquinas e aparelhos",
  "85": "Material eléctrico",
  "87": "Veículos",
  "90": "Instrumentos de precisão",
  "94": "Mobiliário",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}

function chapterLabel(chapter: string) {
  return CHAPTER_NAMES[chapter]
    ? `${chapter} · ${CHAPTER_NAMES[chapter]}`
    : `Capítulo ${chapter}`;
}

function formatRate(value: string) {
  if (!value || value === "—") return "—";
  return value === "Livre" ? "Livre" : `${value}%`;
}

function escapeCell(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcel(
  rows: Array<Record<string, string | number>>,
  filename: string,
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const table = `
    <html><head><meta charset="UTF-8"></head><body><table border="1">
      <thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map(
          (row) =>
            `<tr>${headers.map((header) => `<td>${escapeCell(row[header])}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody>
    </table></body></html>`;
  const blob = new Blob(["\ufeff", table], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function localClassify(products: string[]): Classification[] {
  return products.map((product) => {
    const productTokens = new Set(
      normalize(product)
        .split(" ")
        .filter((token) => token.length > 2),
    );

    const ranked = records
      .map((record) => {
        const text = normalize(record.description);
        let score = 0;
        productTokens.forEach((token) => {
          if (text.includes(token)) score += token.length > 6 ? 3 : 1;
        });
        if (/telemovel|smartphone|telefone/.test(normalize(product)) && record.code.startsWith("8517")) score += 16;
        if (/solar|fotovoltaic/.test(normalize(product)) && record.code.startsWith("8541")) score += 16;
        if (/cimento/.test(normalize(product)) && record.code.startsWith("2523")) score += 16;
        if (/arroz/.test(normalize(product)) && record.code.startsWith("1006")) score += 16;
        return { record, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.record ?? records[0];
    const bestScore = ranked[0]?.score ?? 0;
    const confidence = Math.max(48, Math.min(91, 54 + bestScore * 2));
    return {
      product,
      code: best.code,
      description: best.description,
      confidence,
      rationale: "Correspondência semântica com a designação pautal e o capítulo aplicável.",
      reviewRequired: confidence < 80,
    };
  });
}

export default function Home() {
  const [view, setView] = useState<"search" | "classify" | "vehicles">("search");
  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState("todos");
  const [rate, setRate] = useState("todos");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TariffRecord | null>(null);
  const [productsText, setProductsText] = useState(DEFAULT_PRODUCTS);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [classifierEngine, setClassifierEngine] = useState<ClassifierEngine>("workers-ai");
  const [classificationMode, setClassificationMode] = useState<ClassificationMode | null>(null);
  const [classificationProgress, setClassificationProgress] = useState("");
  const [notice, setNotice] = useState("");

  const chapters = useMemo(
    () => Array.from(new Set(records.map((item) => item.code.slice(0, 2)))).sort(),
    [],
  );

  const rates = useMemo(
    () =>
      Array.from(new Set(records.map((item) => item.rate).filter((item) => item && item !== "—"))).sort(
        (a, b) => a.localeCompare(b, "pt", { numeric: true }),
      ),
    [],
  );

  const filtered = useMemo(() => {
    const term = normalize(query);
    const compactTerm = query.replace(/\D/g, "");
    return records.filter((record) => {
      const matchesQuery =
        !term ||
        normalize(record.description).includes(term) ||
        (compactTerm.length > 0 &&
          record.code.replace(/\D/g, "").includes(compactTerm));
      const matchesChapter = chapter === "todos" || record.code.startsWith(chapter);
      const matchesRate = rate === "todos" || record.rate === rate;
      return matchesQuery && matchesChapter && matchesRate;
    });
  }, [chapter, query, rate]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeFilter(update: () => void) {
    update();
    setPage(1);
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    window.requestAnimationFrame(() => {
      document.getElementById("catalogue-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openAISearch() {
    setClassifierEngine("workers-ai");
    setClassifications([]);
    setView("classify");
  }

  function exportTariff() {
    downloadExcel(
      filtered.map((record) => ({
        "Código pautal": record.code,
        "Designação das mercadorias": record.description,
        UQ: record.unit,
        "Direito de importação (R.G.)": record.rate,
        "Fonte da nomenclatura": record.source === "OGE 2026"
          ? `Lei n.º 14/25, Anexo III, p. ${record.page}`
          : `Pauta Aduaneira 2024, p. ${record.page}`,
        "Fonte da taxa": record.rateSource
          ? `${record.rateSource}, p. ${record.ogePage}`
          : "Decreto Legislativo Presidencial n.º 1/24",
      })),
      filtered.length === records.length
        ? "pauta-aduaneira-angola-taxas-oge-2026.xls"
        : "pauta-aduaneira-angola-taxas-oge-2026-filtrada.xls",
    );
    showNotice(`${filtered.length.toLocaleString("pt-AO")} linhas preparadas para Excel.`);
  }

  function importList(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.split(/[;,\t]/)[0].trim())
        .filter((line) => line && !/^produto|^product/i.test(line));
      setProductsText(lines.join("\n"));
      setClassifications([]);
      showNotice(`${lines.length} produtos importados.`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function classifyProducts() {
    const products = productsText
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (!products.length) {
      showNotice("Adicione pelo menos um produto para classificar.");
      return;
    }

    setClassifying(true);
    setClassificationProgress("A preparar análise…");
    const runLocalAI = async () => {
      try {
        setClassificationProgress("A carregar IA local…");
        const { classifyWithLocalAI } = await import("./lib/local-ai");
        const results = await classifyWithLocalAI(products, records, (completed, total) => {
          setClassificationProgress(`A analisar ${completed} de ${total}…`);
        });
        setClassifications(results);
        setClassificationMode("local-ai");
      } catch {
        setClassifications(localClassify(products));
        setClassificationMode("local-fallback");
        showNotice("O modelo local não carregou. Foi usada a correspondência leve.");
      }
    };

    try {
      if (classifierEngine === "local-ai") {
        await runLocalAI();
      } else {
        setClassificationProgress("A consultar análise avançada…");
        try {
          const response = await fetch("/api/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ products }),
          });
          if (!response.ok) throw new Error("API indisponível");
          const payload = (await response.json()) as {
            results: Classification[];
            provider: "workers-ai";
            model: string;
          };
          setClassifications(payload.results);
          setClassificationMode("workers-ai");
        } catch {
          showNotice("Cloudflare AI indisponível ou quota diária atingida. A usar IA local gratuita.");
          await runLocalAI();
        }
      }
    } finally {
      setClassifying(false);
      setClassificationProgress("");
    }
  }

  function exportClassifications() {
    downloadExcel(
      classifications.map((item) => ({
        Produto: item.product,
        "Código sugerido": item.code,
        "Designação pautal": item.description,
        "Confiança (%)": item.confidence,
        Fundamentação: item.rationale,
        "Revisão necessária": item.reviewRequired ? "Sim" : "Não",
      })),
      "classificacoes-pautais.xls",
    );
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Pauta AO — página inicial" onClick={() => setView("search")}>
          <span className="brand-mark">PA</span>
          <span>
            <strong>Pauta AO</strong>
            <small>Comércio exterior</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          <button className={view === "search" ? "active" : ""} onClick={() => setView("search")}>Pesquisa</button>
          <button className={`ai-nav ${view === "classify" ? "active" : ""}`} onClick={openAISearch}><span aria-hidden="true" /> Pesquisa com IA</button>
          <button className={`vehicle-nav ${view === "vehicles" ? "active" : ""}`} onClick={() => setView("vehicles")}>Simulador de viaturas</button>
        </nav>
        <div className="edition-pill"><span /> Taxas actualizadas · OGE 2026</div>
      </header>

      {view === "search" ? (
        <>
          <section className="hero" id="top">
            <div className="hero-copy">
              <p className="eyebrow">PAUTA ADUANEIRA DE ANGOLA · SH 2022</p>
              <h1>Encontre o código certo.<br />Com clareza.</h1>
              <p className="hero-lede">Pesquise por mercadoria ou código pautal e consulte os direitos de importação actualizados pelo OGE 2026.</p>
            </div>
            <div className="search-card">
              <label htmlFor="tariff-search">O que pretende importar?</label>
              <form className="search-line" onSubmit={submitSearch}>
                <span className="search-symbol" aria-hidden="true" />
                <input
                  id="tariff-search"
                  value={query}
                  onChange={(event) => changeFilter(() => setQuery(event.target.value))}
                  placeholder="Ex.: arroz, telemóvel ou 8517.13.00"
                  autoComplete="off"
                />
                {query && <button type="button" className="clear-button" onClick={() => changeFilter(() => setQuery(""))} aria-label="Limpar pesquisa">×</button>}
                <button type="submit" className="search-submit">Pesquisar <span aria-hidden="true">→</span></button>
              </form>
              <div className="search-card-footer">
                <div className="search-hints">
                  <span>Experimente:</span>
                  {["arroz", "cimento", "automóvel"].map((hint) => (
                    <button key={hint} onClick={() => changeFilter(() => setQuery(hint))}>{hint}</button>
                  ))}
                </div>
                <button className="ai-search-cta" onClick={openAISearch}>
                  <span className="ai-status-dot" aria-hidden="true" />
                  <span><strong>Pesquisa com IA</strong><small>GPT-OSS 20B · gratuita</small></span>
                  <b aria-hidden="true">→</b>
                </button>
              </div>
            </div>
            <div className="source-note">Base: DLP n.º 1/24 · Taxas: Lei n.º 14/25 (OGE 2026), artigo 31.º e Anexo III</div>
          </section>

          <section className="summary-strip" aria-label="Resumo da pauta">
            <div><strong>{records.length.toLocaleString("pt-AO")}</strong><span>códigos indexados</span></div>
            <div><strong>{chapters.length}</strong><span>capítulos disponíveis</span></div>
            <div><strong>01.01.2026</strong><span>taxas OGE 2026</span></div>
            <button className="export-button" onClick={exportTariff}><span aria-hidden="true">↓</span> Exportar para Excel</button>
            <a className="export-button pdf-export" href="/pauta-aduaneira-angola-2024.pdf" download>
              <span aria-hidden="true">↓</span>
              <span><strong>Descarregar PDF oficial</strong><small>Pauta Aduaneira 2024 · 345 páginas</small></span>
            </a>
          </section>

          <section className="catalogue" aria-labelledby="catalogue-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CONSULTA PAUTAL</p>
                <h2 id="catalogue-title">Mercadorias e direitos</h2>
              </div>
              <p><strong>{filtered.length.toLocaleString("pt-AO")}</strong> resultados encontrados</p>
            </div>

            <div className="filter-row">
              <label>
                <span>Capítulo</span>
                <select value={chapter} onChange={(event) => changeFilter(() => setChapter(event.target.value))}>
                  <option value="todos">Todos os capítulos</option>
                  {chapters.map((item) => <option key={item} value={item}>{chapterLabel(item)}</option>)}
                </select>
              </label>
              <label>
                <span>Direito R.G.</span>
                <select value={rate} onChange={(event) => changeFilter(() => setRate(event.target.value))}>
                  <option value="todos">Todas as taxas</option>
                  {rates.map((item) => <option key={item} value={item}>{formatRate(item)}</option>)}
                </select>
              </label>
              {(chapter !== "todos" || rate !== "todos" || query) && (
                <button className="reset-filters" onClick={() => { setQuery(""); setChapter("todos"); setRate("todos"); setPage(1); }}>Limpar filtros</button>
              )}
            </div>

            <div className="table-card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Código pautal</th><th>Designação das mercadorias</th><th>UQ</th><th>Direito R.G.</th><th><span className="sr-only">Ver detalhe</span></th></tr></thead>
                  <tbody>
                    {visibleRows.map((record) => (
                      <tr key={`${record.code}-${record.page}`} onClick={() => setSelected(record)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelected(record); }}>
                        <td><code>{record.code}</code></td>
                        <td>{record.description}</td>
                        <td>{record.unit || "—"}</td>
                        <td><span className={record.rate === "Livre" ? "rate-free" : "rate-value"}>{formatRate(record.rate)}</span></td>
                        <td><button className="row-arrow" aria-label={`Ver detalhe de ${record.code}`}>→</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visibleRows.length && <div className="empty-state"><strong>Nenhuma correspondência.</strong><span>Tente uma descrição mais curta ou remova um filtro.</span></div>}
              </div>
              <div className="pagination">
                <span>A mostrar {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length.toLocaleString("pt-AO")}</span>
                <div><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label="Página anterior">←</button><span>Página {page} de {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((current) => current + 1)} aria-label="Página seguinte">→</button></div>
              </div>
            </div>
          </section>
        </>
      ) : view === "classify" ? (
        <section className="classifier-page" id="top">
          <div className="classifier-intro">
            <p className="eyebrow">PESQUISA PAUTAL COM IA</p>
            <h1>Da descrição comercial<br />à proposta pautal.</h1>
            <p>Pesquise até 50 produtos de uma vez. O GPT-OSS 20B cruza a descrição comercial com a pauta e assinala os casos que exigem revisão.</p>
          </div>

          <div className="classifier-grid">
            <div className="batch-card">
              <div className="card-title-row">
                <div><span className="step-number">01</span><div><strong>Lista de produtos</strong><small>Um produto por linha</small></div></div>
                <label className="file-button">Importar CSV ou TXT<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={importList} /></label>
              </div>
              <div className="engine-picker" role="radiogroup" aria-label="Modo de classificação">
                <button
                  className={classifierEngine === "workers-ai" ? "active" : ""}
                  aria-pressed={classifierEngine === "workers-ai"}
                  onClick={() => { setClassifierEngine("workers-ai"); setClassifications([]); }}
                  disabled={classifying}
                >
                  <span><i /> Cloudflare AI gratuita</span>
                  <small>GPT-OSS 20B · sem chave · quota diária</small>
                </button>
                <button
                  className={classifierEngine === "local-ai" ? "active" : ""}
                  aria-pressed={classifierEngine === "local-ai"}
                  onClick={() => { setClassifierEngine("local-ai"); setClassifications([]); }}
                  disabled={classifying}
                >
                  <span><i /> IA local gratuita</span>
                  <small>Modelo híbrido 2.0 · sem chave · privado</small>
                </button>
              </div>
              <textarea aria-label="Lista de produtos" value={productsText} onChange={(event) => { setProductsText(event.target.value); setClassifications([]); }} placeholder="Ex.: Camisas de algodão para homem" />
              <div className="batch-actions">
                <span>{productsText.split(/\r?\n/).filter((item) => item.trim()).length} de 50 produtos</span>
                <button className="primary-button" onClick={classifyProducts} disabled={classifying}>{classifying ? classificationProgress : classifierEngine === "workers-ai" ? "Pesquisar códigos com IA" : "Classificar produtos"}<span aria-hidden="true">→</span></button>
              </div>
            </div>

            <aside className="method-card">
              <span className="method-kicker">MÉTODO</span>
              <h2>Dois níveis de análise pautal</h2>
              <p>O modo local processa tudo neste dispositivo. O modo Cloudflare usa o GPT-OSS 20B para raciocinar apenas sobre candidatos retirados dos 6.056 códigos da pauta.</p>
              <ul><li><span>1</span>Interpreta sinónimos comerciais</li><li><span>2</span>Cruza família, material e utilização</li><li><span>3</span>Sinaliza alternativas próximas</li></ul>
              <div className="legal-note">A classificação proposta é indicativa e não substitui uma Informação Pautal Vinculativa da Administração Geral Tributária.</div>
            </aside>
          </div>

          {classifications.length > 0 && (
            <section className="results-card" aria-live="polite">
              <div className="results-heading">
                <div><span className="step-number">02</span><div><strong>Propostas de classificação</strong><small>{classificationMode === "workers-ai" ? "Análise concluída pelo GPT-OSS 20B no Cloudflare Workers AI" : classificationMode === "local-ai" ? "IA local gratuita — os dados foram processados neste dispositivo" : "Correspondência local leve — confirme os casos assinalados"}</small></div></div>
                <button className="secondary-button" onClick={exportClassifications}>↓ Exportar resultados</button>
              </div>
              <div className="classification-list">
                {classifications.map((item, index) => (
                  <article className="classification-row" key={`${item.product}-${index}`}>
                    <div className="product-index">{String(index + 1).padStart(2, "0")}</div>
                    <div className="product-name"><strong>{item.product}</strong><span>{item.rationale}</span></div>
                    <div className="suggested-code"><small>CÓDIGO SUGERIDO</small><code>{item.code}</code><span>{item.description}</span></div>
                    <div className="confidence"><small>CONFIANÇA</small><strong>{item.confidence}%</strong><div><i style={{ width: `${item.confidence}%` }} /></div>{item.reviewRequired && <span>Rever</span>}</div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      ) : (
        <VehicleSimulator />
      )}

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">PA</span><span><strong>Pauta AO</strong><small>Consulta aduaneira simplificada</small></span></div>
        <p>Base: DLP n.º 1/24 · Taxas actualizadas pela Lei n.º 14/25 (OGE 2026).</p>
        <span className="creator-credit">
          Criado por <a href="https://www.linkedin.com/in/mjcharata/" target="_blank" rel="noreferrer">Márcio Charata · LinkedIn ↗</a>
        </span>
      </footer>

      {selected && (
        <div className="drawer-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}>
          <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Fechar detalhe">×</button>
            <p className="eyebrow">FICHA PAUTAL</p>
            <code className="detail-code" id="detail-title">{selected.code}</code>
            <h2>{selected.description}</h2>
            <dl>
              <div><dt>Capítulo</dt><dd>{chapterLabel(selected.code.slice(0, 2))}</dd></div>
              <div><dt>Unidade de quantidade</dt><dd>{selected.unit || "Não indicada"}</dd></div>
              <div><dt>Direito de importação — R.G. 2026</dt><dd>{formatRate(selected.rate)}</dd></div>
              <div><dt>Fonte da nomenclatura</dt><dd>{selected.source === "OGE 2026" ? `Anexo III do OGE 2026, página ${selected.page}` : `Pauta Aduaneira 2024, página ${selected.page}`}</dd></div>
              {selected.rateSource && <div><dt>Fonte da taxa</dt><dd>{selected.rateSource}, página {selected.ogePage}</dd></div>}
            </dl>
            <div className="drawer-callout"><strong>Nota de utilização</strong><p>Em 2026, a regra geral estabelece um mínimo de 5%, sem prejuízo das mercadorias Livres, benefícios legais e taxas específicas do Anexo III. Confirme sempre as notas e excepções aplicáveis.</p></div>
            <button className="primary-button full" onClick={() => { navigator.clipboard?.writeText(selected.code); showNotice("Código copiado."); }}>Copiar código pautal</button>
          </aside>
        </div>
      )}

      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}

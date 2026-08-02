# Pauta AO

Aplicação web para consulta da Pauta Aduaneira de Angola, com direitos de importação actualizados pela Lei n.º 14/25 (OGE 2026), artigo 31.º e Anexo III.

## Funcionalidades

- Pesquisa por código pautal ou descrição da mercadoria
- Filtros por capítulo e direito de importação
- Consulta da unidade de quantidade e página da fonte
- Exportação da pauta completa ou filtrada para Excel
- Classificação pautal de listas com até 50 produtos
- Integração opcional com a API da OpenAI
- IA local gratuita, treinada sobre a nomenclatura pautal e executada no navegador

A base incluída em `app/data/pauta.json` contém 6.056 códigos pautais únicos. A nomenclatura parte do Decreto Legislativo Presidencial n.º 1/24 e 1.099 taxas/códigos foram cruzados com o Anexo III do OGE 2026; 50 códigos do anexo foram acrescentados à base.

## Requisitos

- Node.js 22.13 ou superior
- npm

## Executar localmente

```bash
npm install
npm run dev
```

Abra o endereço apresentado no terminal. Para validar uma versão de produção:

```bash
npm test
```

## Integração com a OpenAI

Copie `.env.example` para `.env.local` e preencha a chave:

```env
OPENAI_API_KEY=sua_chave
OPENAI_MODEL=gpt-5.6-luna
```

Nunca publique a sua chave no GitHub. O ficheiro `.env.local` já está excluído pelo `.gitignore`.

Sem uma chave configurada, a aplicação continua funcional. O modo gratuito usa um modelo híbrido local (TF-IDF + LSA, vocabulário comercial, contexto por família pautal e sinais de material/utilização), alinhado com os 6.056 registos, sem enviar as descrições dos produtos para serviços externos.

## Estrutura principal

- `app/page.tsx` - pesquisa, filtros, exportação e classificação em lote
- `app/api/classify/route.ts` - integração com a API da OpenAI
- `app/data/pauta.json` - base de códigos pautais
- `app/data/local-ai-meta.json` e `public/local-ai-model.bin` - modelo semântico local
- `app/globals.css` - estilos visuais
- `tests/` - validação automatizada

## Nota legal

As classificações sugeridas são indicativas. O OGE 2026 fixa, como regra geral, uma taxa mínima de 5%, sem prejuízo das mercadorias classificadas como Livres, dos benefícios fiscais e aduaneiros legalmente previstos e das taxas específicas do Anexo III. Antes de uma declaração aduaneira, devem ser confirmadas as regras gerais de interpretação, as notas de secção e capítulo e, quando aplicável, uma Informação Pautal Vinculativa da Administração Geral Tributária.

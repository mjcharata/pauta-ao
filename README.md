# Pauta AO

Aplicação web para consulta da Pauta Aduaneira de Angola, com direitos de importação actualizados pela Lei n.º 14/25 (OGE 2026), artigo 31.º e Anexo III.

## Funcionalidades

- Pesquisa por código pautal ou descrição da mercadoria
- Filtros por capítulo e direito de importação
- Consulta da unidade de quantidade e página da fonte
- Exportação da pauta completa ou filtrada para Excel
- Download do PDF oficial completo da Pauta Aduaneira 2024
- Simulador de importação de viaturas terrestres, motociclos, embarcações e aeronaves, com conversão da moeda original pela taxa oficial do BNA acrescida de spread de 3,5%, distinção entre novo e usado, benefícios dos eléctricos e cálculo de Direitos Aduaneiros, IEC, Emolumentos Gerais, Imposto de Selo, IVA e autorização ANTT quando aplicável
- Classificação pautal de listas com até 50 produtos
- Classificação avançada gratuita com Cloudflare Workers AI e `@cf/openai/gpt-oss-20b`
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

## Cloudflare Workers AI

O modo avançado usa o modelo aberto GPT-OSS 20B através de uma ligação nativa do Cloudflare Worker. Não é necessário criar nem publicar uma chave de API. A ligação já consta de `wrangler.jsonc`:

```json
"ai": {
  "binding": "AI"
}
```

No plano gratuito, o Workers AI inclui uma quota diária de 10.000 neurons. A quota reinicia às 00:00 UTC; ao ser atingida, o site muda automaticamente para a IA local gratuita, sem cobrança automática.

O GPT-OSS 20B recebe apenas a descrição dos produtos e oito candidatos seleccionados na pauta para cada item. A resposta é validada no servidor: um código que não conste desses candidatos é rejeitado. O modo local continua disponível e usa um modelo híbrido (TF-IDF + LSA, vocabulário comercial, contexto por família pautal e sinais de material/utilização), alinhado com os 6.056 registos, sem enviar dados para serviços externos.

## Estrutura principal

- `app/page.tsx` - pesquisa, filtros, exportação e classificação em lote
- `app/vehicle-simulator.tsx` - códigos, impostos, benefícios e cálculo da importação de viaturas
- `app/api/classify/route.ts` - integração e validação do Cloudflare Workers AI
- `app/data/pauta.json` - base de códigos pautais
- `app/data/local-ai-meta.json` e `public/local-ai-model.bin` - modelo semântico local
- `app/globals.css` - estilos visuais
- `tests/` - validação automatizada

## Nota legal

As classificações sugeridas são indicativas. O OGE 2026 fixa, como regra geral, uma taxa mínima de 5%, sem prejuízo das mercadorias classificadas como Livres, dos benefícios fiscais e aduaneiros legalmente previstos e das taxas específicas do Anexo III. Antes de uma declaração aduaneira, devem ser confirmadas as regras gerais de interpretação, as notas de secção e capítulo e, quando aplicável, uma Informação Pautal Vinculativa da Administração Geral Tributária.

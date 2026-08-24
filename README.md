# Simulador de expansão de operações B2B

Dashboard analítico + simulador de decisão para uma distribuidora B2B decidir em qual cidade do Brasil abrir sua próxima operação — combinando a base de vendas interna da empresa com uma camada de pesquisa de mercado externa, calculada ao vivo para **qualquer um dos 5.571 municípios do Brasil**.

> **Nota:** projeto de portfólio derivado de um case real que desenvolvi. Nome da empresa, cidades-sede, cidades candidatas e todos os números financeiros foram substituídos por uma empresa fictícia ("Novara") e dados sintéticos. A arquitetura, a metodologia de decisão e o motor de cálculo são reais.

## O problema

Uma distribuidora B2B de foodservice opera hoje em duas praças com centro de distribuição próprio e precisa decidir onde abrir a terceira. A decisão não pode se apoiar só em "achismo" nem só em dado interno (a empresa não tem histórico nenhum nas cidades candidatas) — precisa cruzar o que a empresa já sabe sobre si mesma com dados públicos de mercado, mão de obra e tributação para cada candidata.

## Como funciona

O app tem duas camadas de dado, claramente separadas:

1. **Base interna** — um pipeline em Python/pandas agrega ~4.600 linhas de venda sintéticas (mês × cidade × categoria de cliente × categoria de produto × cadeia de temperatura) em um arquivo TypeScript estático (`src/lib/novara/facts.ts`), com toda soma reconciliada até o centavo contra a fonte por asserção em tempo de build. Essa camada alimenta as páginas de "Base interna" (cobertura, financeiro, maturação, mix, praças, mapa, qualidade do dado).
2. **Simulador de mercado** — para qualquer cidade que o usuário digitar, calcula ao vivo TAM/SAM/SOM, crescimento, entorno geográfico, ticket médio provável, fricção logística, disponibilidade de mão de obra, risco tributário e concorrência — consultando em tempo real as APIs públicas do IBGE (CEMPRE/SIDRA, PAC, PNAD Contínua, Malhas). Essa é a parte que generaliza: não precisa a empresa já ter operado ali.

Uma página de **Metodologia** documenta cada um dos 5 critérios de decisão (peso, fórmula, armadilhas conhecidas, fonte de dado), e a página de **Simulador** aplica a mesma metodologia às 4 cidades candidatas do case (ou a qualquer outra cidade escolhida pelo usuário).

## Os 5 critérios de decisão

| # | Critério | O que mede |
|---|---|---|
| 1 | Mercado | TAM/SAM/SOM da cidade, crescimento do setor-alvo, mercado adicional no entorno |
| 2 | Operação | Ticket médio provável por cliente, fricção logística até o entorno |
| 3 | Abastecimento do CD | Distância média ponderada aos polos fornecedores nacionais de cada categoria vendida |
| 4 | Risco e concorrência | Carga tributária efetiva, conhecimento de mercado local, mão de obra disponível, concorrência física |
| 5 | Aderência à estratégia interna | Coerência com a tese de expansão já sinalizada publicamente pela empresa |

Nenhuma cidade vence em todos os critérios — a recomendação final depende de como os 5 são ponderados, e a página de Metodologia mostra 4 cenários de peso diferentes lado a lado, incluindo casos onde a cidade recomendada muda de acordo com a prioridade (crescimento agressivo vs. execução conservadora).

## Decisões de engenharia que valem a leitura

- **Reconciliação por asserção, não por inspeção manual**: `scripts/build_facts.py` recusa a gerar o arquivo de saída se qualquer soma agregada divergir do CSV bruto por mais de um centavo — o pipeline falha alto (`assert`) em vez de publicar um número que não fecha.
- **SSR sem divergência de hidratação**: todo número chega ao componente já formatado como string (nunca `Intl.NumberFormat` dentro de componente), porque a formatação ICU do Node em build-time nem sempre bate byte a byte com a do navegador — e uma pequena divergência aí quebra a hidratação do React silenciosamente.
- **Nunca fabricar coordenada**: quando um CEP não tem geocodificação confiável, o dado fica marcado como "não mapeado" — nunca cai num fallback de coordenada aproximada que pareceria real no mapa.
- **Rateio corrigido por densidade administrativa**: o SAM do entorno geográfico usa a média por município, não o total — Minas Gerais tem 853 municípios contra 417 da Bahia, e comparar o total bruto favoreceria estados com malha administrativa mais fragmentada, não com mercado maior de verdade.
- **Malha de 2 saltos**: o raio de busca inclui a UF da cidade, a vizinha direta e a vizinha-de-vizinha — o suficiente para cobrir um raio de 312km mesmo a partir de um estado pequeno, sem heurística de posição geográfica.

## Arquitetura de código

```
src/
├── lib/novara/
│   ├── facts.ts               # Dado agregado, GERADO — não editar à mão
│   ├── engine.ts               # Toda derivação numérica da base interna
│   ├── simuladorMercado.ts     # TAM/SAM/SOM/entorno ao vivo, qualquer cidade
│   ├── abastecimentoMercado.ts # Critério 3 ao vivo
│   ├── maoDeObraMercado.ts     # Critério 4.3 ao vivo (PNAD Contínua)
│   ├── geoEntorno.ts           # Centróide/distância via IBGE Malhas
│   ├── metodologia.ts          # Conteúdo estático da página /metodologia
│   └── municipios.ts           # Os 5.571 municípios do Brasil (IBGE)
├── components/novara/          # Componentes de apresentação do dashboard
├── components/ui/              # shadcn/ui (genérico)
├── routes/                     # Uma rota por página (TanStack Router)
└── integrations/supabase/      # Integração opcional — ver "Como rodar"

scripts/
├── gerar_base_sintetica.py     # Gera o CSV de vendas sintético
├── build_facts.py              # CSV bruto → facts.ts, com reconciliação
└── gerar_pdf_case.py           # Gera o PDF-resumo do case
```

## Como rodar

O dashboard roda inteiro a partir de `facts.ts` — **não precisa de nenhuma conta ou credencial** para funcionar.

```bash
git clone <este-repositório>
cd <pasta-do-repositório>
npm install     # ou: bun install
npm run dev     # ou: bun run dev
```

A integração com Supabase (`src/integrations/supabase/`) fica documentada como exemplo de arquitetura para uma versão com backend real, mas é opcional: sem `.env` configurado, a autenticação de servidor falha em modo silencioso e o dashboard continua funcionando normal.

Para regenerar o dado sintético do zero:

```bash
python3 scripts/gerar_base_sintetica.py --out /tmp/base
python3 scripts/build_facts.py --base /tmp/base --out src/lib/novara/facts.ts
python3 scripts/gerar_pdf_case.py --out public/Case_Novara_PortoAlegre_Resumo.pdf
```

## Stack

TanStack Start + React 19, Tailwind CSS 4, Recharts/SVG para gráficos, Leaflet para o mapa, Python + pandas para o ETL da base interna, e as APIs públicas do IBGE (CEMPRE/SIDRA, PAC, PNAD Contínua, Malhas, Localidades) para a camada de mercado ao vivo.

## Licença

MIT.

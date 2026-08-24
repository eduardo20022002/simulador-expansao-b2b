/* ============================================================================
 * Escrito à mão a partir de `fontes_de_dados.md` (documento de referência do
 * case, consolidado em 23/08/2026). Ao contrário de `facts.ts`, este arquivo
 * não é gerado por script — é o inventário de proveniência (o que veio da
 * base interna da Novara, o que veio de fonte externa e qual foi o dado
 * gerado), por critério de decisão. Atualizar manualmente se o documento de
 * referência mudar.
 * ==========================================================================*/

import type { TableRow } from "./engine";

export interface ExternalSourceLegend {
  name: string;
  what: string;
  access: string;
}

/** As fontes externas usadas no projeto, citadas por nome no restante da página. */
export const EXTERNAL_SOURCES: ExternalSourceLegend[] = [
  {
    name: "IBGE CEMPRE/SIDRA",
    what: "Cadastro Central de Empresas — nº de empresas e massa salarial por CNAE, por município/UF/Brasil",
    access: "API pública · servicodados.ibge.gov.br/api/v3/agregados/9418",
  },
  {
    name: "IBGE PAC",
    what: "Pesquisa Anual de Comércio — receita do comércio atacadista por UF",
    access:
      "Arquivo xlsx · ftp.ibge.gov.br/Comercio_e_Servicos/Pesquisa_Anual_de_Comercio (não está na API)",
  },
  {
    name: "IBGE Malhas",
    what: "Geometria/polígono de município, usada para calcular centróide e distância",
    access: "API pública · servicodados.ibge.gov.br/api/v3/malhas",
  },
  {
    name: "IBGE Localidades",
    what: "Nome de município ↔ código IBGE",
    access: "API pública · servicodados.ibge.gov.br/api/v1/localidades",
  },
  {
    name: "IBGE PNAD Contínua/SIDRA",
    what: "Taxa de desemprego, estoque de mão de obra e rendimento, por grupamento ocupacional",
    access:
      "API pública · servicodados.ibge.gov.br/api/v3/agregados (tabelas 4099, 5435, 5444, 4093)",
  },
  {
    name: "IBGE Classificação CNAE",
    what: "Descrição oficial de cada classe CNAE 2.0",
    access: "API pública · servicodados.ibge.gov.br/api/v2/cnae/classes",
  },
  {
    name: "BrasilAPI CEP",
    what: "Geocodificação de endereço/CEP (lat/long)",
    access: "API pública · brasilapi.com.br/api/cep/v2",
  },
  {
    name: "Pesquisa dirigida — tributário",
    what: "Alíquotas ICMS, ICMS-ST, incentivos fiscais por estado",
    access: "WebSearch/WebFetch · SEFAZ estaduais, RICMS, agregadores tributários",
  },
  {
    name: "Pesquisa dirigida — estratégia Novara",
    what: "Perfil da empresa, fundadores, funding, expansão histórica",
    access: "WebSearch/WebFetch · imprensa e bases de VC",
  },
  {
    name: "Pesquisa dirigida — concorrência digital",
    what: "Identificação de concorrentes B2B digitais e presença por cidade",
    access: "WebSearch/WebFetch · sites institucionais e imprensa de investimento",
  },
  {
    name: "Fontes tentadas e indisponíveis",
    what: "RFB Dados Abertos (CNPJ individual) e PDET/RAIS/CAGED (mão de obra por CBO)",
    access: "Testadas, servidor fora do ar nas duas — substituídas por CEMPRE e PNAD Contínua",
  },
];

export interface CriterionSource {
  number: string;
  title: string;
  url: string;
  internal: string;
  external: string;
  generated: string;
}

/** Proveniência por critério de decisão — mesma estrutura de `fontes_de_dados.md`. */
export const CRITERIA_SOURCES: CriterionSource[] = [
  {
    number: "1",
    title: "Mercado — TAM / SAM / SOM, crescimento, entorno",
    url: "/externos/mercado",
    internal:
      "net_revenue por customer_category e cep (proxy de cliente cep+categoria) → ticket médio real por categoria, calibrado sobre toda a base (97 cidades). Latitude/longitude para o raio empírico de Curitiba/Florianópolis.",
    external:
      "IBGE PAC (Tabela 12/2023) para o TAM; IBGE CEMPRE/SIDRA (tabela 9418, variável 2585) para contagem de empresas por CNAE; IBGE Malhas e Localidades para centróide e distância do entorno.",
    generated:
      "TAM por cidade (R$21,99bi Porto Alegre a R$73,00bi Campinas); ticket médio anual por categoria; SAM por cidade (R$125,75mi Uberlândia a R$515,06mi Goiânia); SOM (SAM × penetração 8,2%); SAM sede+entorno.",
  },
  {
    number: "2",
    title: "Operação — ticket, frequência, margem, logística",
    url: "/externos/operacao",
    internal:
      "net_revenue por região (PR, SC) para o ticket real de calibração; gross_profit = net_revenue + cogs para a margem real; latitude/longitude de cada cliente real para a dispersão.",
    external:
      "IBGE CEMPRE/SIDRA (variável 662, massa salarial + 2585, nº empresas) nível UF, como proxy de porte; BrasilAPI CEP e IBGE Malhas para geocodificação e centróide das 4 candidatas.",
    generated:
      "Constante K (calibrada na praça-sede); ticket estimado por cidade candidata (R$1.210,80 Porto Alegre a R$2.654,18 Goiânia); margem constante (11,45%, Florianópolis); distância e dispersão por cidade.",
  },
  {
    number: "3",
    title: "Abastecimento do CD",
    url: "/externos/abastecimento",
    internal:
      "product_category × net_revenue — lista-mestra das 48 categorias de produto e peso% de cada uma no mix real (base inteira).",
    external:
      "IBGE Classificação CNAE (API v2) para mapear categoria→CNAE de fornecedor; IBGE CEMPRE/SIDRA (nível UF e município) para contagem e porte de fornecedor; IBGE Malhas para distância aos polos fornecedores.",
    generated:
      "Mapeamento completo categoria→CNAE (34 CNAEs); ranking nacional dos top-5 polos fornecedores por categoria; Score_abastecimento final (Campinas lidera com 629km, Uberlândia mais distante com 2.231km).",
  },
  {
    number: "4",
    title: "Risco e concorrência — tributário, mercado local, mão de obra, concorrência",
    url: "/externos/risco",
    internal: "Nenhuma.",
    external:
      "Pesquisa dirigida (SEFAZ, RICMS, agregadores tributários) para o risco tributário; IBGE Malhas para o proxy de conhecimento de mercado; IBGE PNAD Contínua/SIDRA para mão de obra; IBGE CEMPRE/SIDRA + pesquisa dirigida de concorrência digital.",
    generated:
      "Carga efetiva de ICMS por cidade (Uberlândia 6,1% a Goiânia 22,0%); proxy de conhecimento de mercado (Uberlândia 10,00 a Campinas 0,02); estoque/rendimento/desemprego por cidade (Porto Alegre 9,78 a Goiânia 1,00); concorrentes físicos e digitais por cidade.",
  },
  {
    number: "5",
    title: "Aderência à estratégia interna",
    url: "/externos/aderencia",
    internal: "Nenhuma.",
    external:
      "Pesquisa dirigida sobre a própria Novara — imprensa (Brazil Journal, Forbes Brasil, TechCrunch, Bloomberg Línea, Gazeta do Povo, Abrasel PR/SC), bases de VC (CB Insights), bases de CNPJ (Casa dos Dados, Econodata, CNPJá).",
    generated:
      'Fatos-base da estratégia real (tese pública "3º mercado no Sul", histórico de expansão PR→SC→RS→SP); proxy de scorecard de diretor (Uberlândia 8,8 a Campinas 1,6).',
  },
];

/** Tabela-resumo de dependência de fonte por critério, para a DataTable. */
export const SOURCE_DEPENDENCY_ROWS: TableRow[] = [
  {
    key: "1",
    label: "1. Mercado",
    cells: ["✅", "✅ CEMPRE, PAC, Malhas", "—"],
  },
  {
    key: "2",
    label: "2. Operação",
    cells: ["✅", "✅ CEMPRE, Malhas, BrasilAPI", "—"],
  },
  {
    key: "3",
    label: "3. Abastecimento",
    cells: ["✅", "✅ CEMPRE, Classificação CNAE, Malhas", "—"],
  },
  {
    key: "4",
    label: "4. Risco/Concorrência",
    cells: ["—", "✅ CEMPRE, PNAD Contínua", "✅ Tributário, concorrência digital"],
  },
  {
    key: "5",
    label: "5. Aderência estratégica",
    cells: ["—", "—", "✅ Estratégia pública da Novara"],
  },
];

export const SOURCE_DEPENDENCY_HEADERS = [
  "critério",
  "fonte interna",
  "fonte externa pública (API)",
  "pesquisa dirigida",
];

/* ============================================================================
 * Resultados por critério — números reais das 4 cidades candidatas, extraídos
 * de `metodologia_analise.md` (seções 1 a 6). As 4 cidades são as pedidas no
 * case: Porto Alegre (RS), Campinas (SP), Goiânia (GO), Uberlândia (MG). A
 * ordem de cada tabela segue a ordem em que o documento de metodologia
 * apresenta o resultado (normalmente do melhor para o pior colocado).
 * ==========================================================================*/

// --- Critério 1 — Mercado ---------------------------------------------------

export const TAM_HEADERS = ["cidade", "PAC 2023 atacado/UF", "participação", "TAM"];
export const TAM_ROWS: TableRow[] = [
  {
    key: "poa",
    label: "Porto Alegre (RS)",
    cells: ["R$ 138.582.542 mil", "15,87%", "R$ 21,99 bi"],
  },
  {
    key: "campinas",
    label: "Campinas (SP)",
    cells: ["R$ 370.629.194 mil", "19,70%", "R$ 73,00 bi"],
  },
  {
    key: "goiania",
    label: "Goiânia (GO)",
    cells: ["R$ 50.744.438 mil", "100,00%", "R$ 50,74 bi"],
  },
  { key: "udi", label: "Uberlândia (MG)", cells: ["R$ 25.862.318 mil", "38,98%", "R$ 10,08 bi"] },
];

export const SAM_SOM_HEADERS = [
  "cidade",
  "SAM (sede, sem Hospitalar)",
  "SOM (SAM × 8,2%)",
  "nota 1.1",
];
export const SAM_SOM_ROWS: TableRow[] = [
  { key: "goiania", label: "Goiânia (GO)", cells: ["R$ 515,06 mi", "R$ 48,42 mi", "10,00"] },
  { key: "campinas", label: "Campinas (SP)", cells: ["R$ 470,60 mi", "R$ 44,24 mi", "8,86"] },
  { key: "poa", label: "Porto Alegre (RS)", cells: ["R$ 288,72 mi", "R$ 27,14 mi", "4,19"] },
  { key: "udi", label: "Uberlândia (MG)", cells: ["R$ 125,75 mi", "R$ 11,82 mi", "0,00"] },
];

export const CRESCIMENTO_HEADERS = [
  "cidade",
  "empresas 2022",
  "empresas 2024",
  "CAGR",
  "projeção 2029",
  "nota 1.2",
];
export const CRESCIMENTO_ROWS: TableRow[] = [
  {
    key: "campinas",
    label: "Campinas (SP)",
    cells: ["18.780", "21.456", "6,89%", "29.935", "10,00"],
  },
  {
    key: "goiania",
    label: "Goiânia (GO)",
    cells: ["22.173", "23.701", "3,39%", "27.998", "3,67"],
  },
  { key: "udi", label: "Uberlândia (MG)", cells: ["4.937", "5.209", "2,72%", "5.956", "2,45"] },
  {
    key: "poa",
    label: "Porto Alegre (RS)",
    cells: ["13.260", "13.624", "1,36%", "14.578", "0,00"],
  },
];

export const ENTORNO_HEADERS = [
  "cidade",
  "SAM entorno líquido (312km)",
  "municípios",
  "SAM médio/município",
  "nota 1.3",
];
export const ENTORNO_ROWS: TableRow[] = [
  {
    key: "goiania",
    label: "Goiânia (GO)",
    cells: ["R$ 592,15 mi", "208", "R$ 2.846.889", "10,00"],
  },
  {
    key: "poa",
    label: "Porto Alegre (RS)",
    cells: ["R$ 663,21 mi", "237", "R$ 2.798.352", "9,49"],
  },
  {
    key: "campinas",
    label: "Campinas (SP)",
    cells: ["R$ 1.542,93 mi", "581", "R$ 2.655.643", "7,98"],
  },
  { key: "udi", label: "Uberlândia (MG)", cells: ["R$ 760,64 mi", "400", "R$ 1.901.598", "0,00"] },
];

export const CRITERIO1_HEADERS = [
  "cidade",
  "1.1 SAM sede (50%)",
  "1.2 crescimento (25%)",
  "1.3 entorno (25%)",
  "nota Critério 1",
];
export const CRITERIO1_ROWS: TableRow[] = [
  { key: "campinas", label: "Campinas (SP)", cells: ["8,86", "10,00", "7,98", "8,93"] },
  { key: "goiania", label: "Goiânia (GO)", cells: ["10,00", "3,67", "10,00", "8,42"] },
  { key: "poa", label: "Porto Alegre (RS)", cells: ["4,19", "0,00", "9,49", "4,47"] },
  { key: "udi", label: "Uberlândia (MG)", cells: ["0,00", "2,45", "0,00", "0,61"] },
];

// --- Critério 2 — Operação ---------------------------------------------------

export const TICKET_HEADERS = [
  "cidade",
  "porte médio (massa salarial/empresa, UF)",
  "ticket estimado",
  "nota 2.1",
];
export const TICKET_ROWS: TableRow[] = [
  {
    key: "goiania",
    label: "Goiânia (GO)",
    cells: ["R$ 463.124,72", "R$ 2.654,18/mês", "10,00"],
  },
  {
    key: "campinas",
    label: "Campinas (SP)",
    cells: ["R$ 284.389,18", "R$ 1.629,84/mês", "2,90"],
  },
  { key: "udi", label: "Uberlândia (MG)", cells: ["R$ 250.671,33", "R$ 1.436,60/mês", "1,56"] },
  { key: "poa", label: "Porto Alegre (RS)", cells: ["R$ 211.271,05", "R$ 1.210,80/mês", "0,00"] },
];

export const LOGISTICA_HEADERS = ["cidade", "nota 2.4 (distância + dispersão)"];
export const LOGISTICA_ROWS: TableRow[] = [
  { key: "goiania", label: "Goiânia (GO)", cells: ["10,00"] },
  { key: "poa", label: "Porto Alegre (RS)", cells: ["9,07"] },
  { key: "campinas", label: "Campinas (SP)", cells: ["3,77"] },
  { key: "udi", label: "Uberlândia (MG)", cells: ["0,00"] },
];

export const CRITERIO2_HEADERS = ["cidade", "2.1 ticket", "2.4 logística", "nota Critério 2"];
export const CRITERIO2_ROWS: TableRow[] = [
  { key: "goiania", label: "Goiânia (GO)", cells: ["10,00", "10,00", "10,00"] },
  { key: "poa", label: "Porto Alegre (RS)", cells: ["0,00", "9,07", "4,54"] },
  { key: "campinas", label: "Campinas (SP)", cells: ["2,90", "3,77", "3,34"] },
  { key: "udi", label: "Uberlândia (MG)", cells: ["1,56", "0,00", "0,78"] },
];

// --- Critério 3 — Abastecimento do CD ---------------------------------------

export const ABASTECIMENTO_HEADERS = [
  "cidade",
  "Score_abastecimento (km ponderado)",
  "nota Critério 3",
];
export const ABASTECIMENTO_ROWS: TableRow[] = [
  { key: "campinas", label: "Campinas (SP)", cells: ["629,1 km", "10,00"] },
  { key: "goiania", label: "Goiânia (GO)", cells: ["967,5 km", "7,89"] },
  { key: "poa", label: "Porto Alegre (RS)", cells: ["1.401,2 km", "5,18"] },
  { key: "udi", label: "Uberlândia (MG)", cells: ["2.231,1 km", "0,00"] },
];

// --- Critério 4 — Risco e concorrência ---------------------------------------

export const TRIBUTARIO_HEADERS = [
  "cidade",
  "alíquota nominal",
  "incentivo relevante",
  "carga efetiva (conservador)",
  "nota 4.1",
];
export const TRIBUTARIO_ROWS: TableRow[] = [
  {
    key: "udi",
    label: "Uberlândia (MG)",
    cells: ["18%", "TTS/Atacadista — regime especial confirmado por decreto estadual", "6,1%", "10,00"],
  },
  {
    key: "campinas",
    label: "Campinas (SP)",
    cells: ["18%", "Regime especial pontual (exige ≥90% compras dentro do estado)", "19,0%", "1,89"],
  },
  {
    key: "poa",
    label: "Porto Alegre (RS)",
    cells: ["17%", "Integrar/RS (percentual de redução não confirmado para o setor)", "20,5%", "0,94"],
  },
  {
    key: "goiania",
    label: "Goiânia (GO)",
    cells: ["19% + 2% fundo estadual", "Nenhum programa nomeado encontrado", "22,0%", "0,00"],
  },
];

export const MERCADO_LOCAL_HEADERS = [
  "cidade",
  "distância à operação mais próxima",
  "mesma região (Sul)",
  "nota 4.2 (proxy)",
];
export const MERCADO_LOCAL_ROWS: TableRow[] = [
  { key: "udi", label: "Uberlândia (MG)", cells: ["251 km", "Sim", "10,00"] },
  { key: "poa", label: "Porto Alegre (RS)", cells: ["665 km", "Sim", "8,51"] },
  { key: "campinas", label: "Campinas (SP)", cells: ["1.639 km", "Não", "0,02"] },
  { key: "goiania", label: "Goiânia (GO)", cells: ["1.642 km", "Não", "0,00"] },
];

export const MAO_DE_OBRA_HEADERS = [
  "cidade",
  "estoque/PEA",
  "rendimento médio",
  "desemprego",
  "nota 4.3",
];
export const MAO_DE_OBRA_ROWS: TableRow[] = [
  { key: "poa", label: "Porto Alegre (RS)", cells: ["29,9%", "R$ 2.426", "11,4%", "9,78"] },
  { key: "udi", label: "Uberlândia (MG)", cells: ["28,6%", "R$ 2.365", "6,3%", "6,69"] },
  { key: "campinas", label: "Campinas (SP)", cells: ["25,7%", "R$ 2.928", "4,4%", "1,70"] },
  { key: "goiania", label: "Goiânia (GO)", cells: ["25,2%", "R$ 3.292", "6,5%", "1,00"] },
];

export const CONCORRENCIA_HEADERS = [
  "cidade",
  "SAM",
  "concorrentes físicos (CNAE 46)",
  "mercado por concorrente",
  "nota 4.4",
];
export const CONCORRENCIA_ROWS: TableRow[] = [
  {
    key: "goiania",
    label: "Goiânia (GO)",
    cells: ["R$ 515,06 mi", "6.058", "R$ 85.021", "10,00"],
  },
  {
    key: "poa",
    label: "Porto Alegre (RS)",
    cells: ["R$ 288,72 mi", "3.699", "R$ 78.053", "8,04"],
  },
  { key: "udi", label: "Uberlândia (MG)", cells: ["R$ 125,75 mi", "1.741", "R$ 72.230", "6,40"] },
  {
    key: "campinas",
    label: "Campinas (SP)",
    cells: ["R$ 470,60 mi", "9.516", "R$ 49.454", "0,00"],
  },
];

export const CRITERIO4_HEADERS = [
  "cidade",
  "4.1 tributário (30%)",
  "4.2 mercado local (20%)",
  "4.3 mão de obra (25%)",
  "4.4 concorrência (25%)",
  "nota Critério 4",
  "haircut sobre o VPL",
];
export const CRITERIO4_ROWS: TableRow[] = [
  {
    key: "udi",
    label: "Uberlândia (MG)",
    cells: ["10,00", "10,00", "6,69", "6,40", "8,27", "10,18%"],
  },
  {
    key: "poa",
    label: "Porto Alegre (RS)",
    cells: ["0,94", "8,51", "9,78", "8,04", "6,44", "15,68%"],
  },
  {
    key: "goiania",
    label: "Goiânia (GO)",
    cells: ["0,00", "0,00", "1,00", "10,00", "2,75", "26,75%"],
  },
  {
    key: "campinas",
    label: "Campinas (SP)",
    cells: ["1,89", "0,02", "1,70", "0,00", "1,00", "32,01%"],
  },
];

// --- Critério 5 — Aderência à estratégia interna -----------------------------

export const ADERENCIA_HEADERS = [
  "subpergunta",
  "Porto Alegre (RS)",
  "Campinas (SP)",
  "Goiânia (GO)",
  "Uberlândia (MG)",
];
export const ADERENCIA_ROWS: TableRow[] = [
  { key: "q1", label: "1. Sul / roadmap sinalizado", cells: ["8", "1", "1", "9"] },
  { key: "q2", label: "2. Malha logística contígua", cells: ["7", "1", "1", "10"] },
  {
    key: "q3",
    label: '3. Porte compatível c/ tese "mercado menor"',
    cells: ["4", "1", "3", "9"],
  },
  { key: "q4", label: "4. Cabeça-de-ponte regional", cells: ["6", "2", "1", "9"] },
  { key: "q5", label: "5. Concorrente-alvo / mercado-vitrine", cells: ["5", "3", "3", "7"] },
  { key: "final", label: "Nota final (proxy)", cells: ["6,0", "1,6", "1,8", "8,8"] },
];

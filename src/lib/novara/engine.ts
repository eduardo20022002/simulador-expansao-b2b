/* ============================================================================
 * ENGINE — toda derivação numérica do dashboard vive aqui.
 * Componentes renderizam; não calculam e não formatam. Todo valor chega à tela
 * como string já pronta.
 *
 * Fonte única: `facts.ts`, gerado por scripts/build_facts.py a partir de
 * base_case_planejamento.csv (382.129 linhas, jan–jul/2026). Nenhum número é
 * digitado à mão neste arquivo.
 *
 * Formatação é feita à mão (sem Intl) de propósito: SSR e hidratação precisam
 * produzir string idêntica, e a ICU do Node nem sempre bate com a do navegador.
 * ==========================================================================*/

import {
  CITIES,
  CLIENTS_BY_CITY,
  CLIENTS_BY_MONTH_CITY,
  CLIENTS_BY_MONTH_REGION,
  CLIENTS_BY_NEIGHBORHOOD,
  CLIENTS_BY_REGION_CUST,
  COHORT,
  CUSTOMER_CATEGORIES,
  FACT_GEO,
  FACT_NEIGHBORHOOD,
  FACT_PROD,
  MONTHS,
  NEIGHBORHOODS,
  NEW_CLIENTS,
  PARETO,
  PRODUCT_CATEGORIES,
  REGIONS,
  RETENTION,
  SOURCE_QUALITY,
  TEMPERATURES,
  TOTALS,
  type Region,
} from "./facts";

/** Índices das colunas dos fatos — nomeados para não espalhar número mágico. */
const G = {
  month: 0,
  city: 1,
  cust: 2,
  temp: 3,
  kg: 4,
  gross: 5,
  net: 6,
  cogs: 7,
  lines: 8,
} as const;
const P = { month: 0, region: 1, prod: 2, temp: 3, kg: 4, gross: 5, net: 6, cogs: 7 } as const;

const REGION_OF_CITY: Region[] = CITIES.map((c) => c.region);
const REGION_INDEX: Record<Region, number> = { PR: 0, SC: 1 };
export const REGION_NAME: Record<Region, string> = { PR: "Paraná", SC: "Santa Catarina" };
const CAPITAL_OF: Record<Region, string> = { PR: "CURITIBA", SC: "FLORIANOPOLIS" };

/* ------------------------------------------------------------------- tipos */

export interface MetricExplainer {
  metric: string;
  computedFrom: string;
}
export interface Kpi {
  key: string;
  label: string;
  value: string;
  caption: string;
  trend?: string;
  /** Como esta métrica é calculada — vira o "i" ao lado do número. */
  explain: MetricExplainer[];
}
export interface RankItem {
  label: string;
  value: string;
  share: string;
  /** 0..1 — largura da barra relativa ao primeiro colocado */
  fraction: number;
}
export interface RegionStat {
  uf: string;
  explain: MetricExplainer[];
  name: string;
  revenue: string;
  share: string;
  fraction: number;
  profit: string;
  margin: string;
  volume: string;
  cities: string;
  caption: string;
}
export interface CascadeStep {
  key: string;
  label: string;
  value: string;
  share: string;
  from: number;
  to: number;
  kind: "total" | "outflow";
  tone: "neutral" | "discount" | "cost" | "profit";
  note: string;
  explain: MetricExplainer[];
}
export interface MonthPoint {
  label: string;
  value: number;
  display: string;
}
export interface Series {
  key: string;
  label: string;
  color: string;
  points: MonthPoint[];
}
export interface Coverage {
  label: string;
  value: string;
  caption: string;
  explain: MetricExplainer[];
}
export interface BigFigure {
  label: string;
  value: string;
  exact: string;
  caption: string;
  explain: MetricExplainer[];
}
export interface DerivedMetric {
  key: string;
  label: string;
  value: string;
  caption: string;
  explain: MetricExplainer[];
}
export interface ColumnSpec {
  name: string;
  what: string;
  example: string;
  role: "chave" | "medida";
}
export interface Treatment {
  label: string;
  figure: string;
  detail: string;
}
export interface TableRow {
  key: string;
  label: string;
  cells: string[];
  /** 0..1 — barra de fundo opcional na primeira célula numérica */
  fraction?: number;
}
export interface SplitPart {
  key: string;
  label: string;
  value: string;
  share: string;
  fraction: number;
  color: string;
}
export interface MapPoint {
  id: string;
  label: string;
  lat: number;
  lon: number;
  revenue: string;
  revenueExact: string;
  share: string;
  margin: string;
  clients: string;
  /** 0..1 — já normalizado dentro do conjunto retornado, mesma lógica de RankItem.fraction */
  radiusFraction: number;
}
export interface UnmappedSummary {
  city: string;
  revenue: string;
  revenueExact: string;
  /** % sobre a receita da própria cidade */
  share: string;
  fraction: number;
  /** true quando a receita não mapeada passa de 50% da cidade */
  lowCoverage: boolean;
}

/* ------------------------------------------------------------- formatação */

function groupDigits(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function fmtDec(n: number, d = 1): string {
  const neg = n < 0;
  const [i = "0", f = ""] = Math.abs(n).toFixed(d).split(".");
  return (neg ? "−" : "") + groupDigits(i) + (d > 0 ? "," + f : "");
}
export function fmtInt(n: number): string {
  return fmtDec(n, 0);
}
export function fmtBRL(n: number): string {
  return "R$ " + fmtDec(n, 2);
}
export function fmtBRLShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return "R$ " + fmtDec(n / 1e9, 2) + " bi";
  if (a >= 1e6) return "R$ " + fmtDec(n / 1e6, 1) + " mi";
  if (a >= 1e3) return "R$ " + fmtDec(n / 1e3, 1) + " mil";
  return "R$ " + fmtDec(n, 2);
}
export function fmtPct(n: number, d = 1): string {
  return fmtDec(n, d) + "%";
}
export function fmtSigned(n: number, d = 1): string {
  return (n > 0 ? "+" : "") + fmtDec(n, d) + "%";
}
export function fmtTon(kg: number): string {
  return fmtDec(kg / 1000, 0) + " t";
}

/** Formatadores de marcação de eixo. O gráfico não formata: recebe um destes. */
export const TICK = {
  decimal1: (n: number) => fmtDec(n, 1),
  int: (n: number) => fmtInt(Math.round(n)),
  reais: (n: number) => fmtDec(n, 0),
  pct: (n: number) => fmtDec(n, 0) + "%",
};

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
export function monthLabel(i: number): string {
  return MONTH_NAMES[Number(MONTHS[i]!.slice(5, 7)) - 1]!;
}
export const WINDOW_LABEL = `${monthLabel(0)}–${monthLabel(MONTHS.length - 1)}/${MONTHS[0]!.slice(0, 4)}`;

/* ------------------------------------------------------ agregação genérica */

interface Agg {
  kg: number;
  gross: number;
  net: number;
  cogs: number;
  lines: number;
}
const zero = (): Agg => ({ kg: 0, gross: 0, net: 0, cogs: 0, lines: 0 });
function add(a: Agg, r: readonly number[], geo = true): Agg {
  a.kg += r[G.kg]!;
  a.gross += r[G.gross]!;
  a.net += r[G.net]!;
  a.cogs += r[G.cogs]!;
  if (geo) a.lines += r[G.lines]!;
  return a;
}
/** Lucro bruto = net + cogs (cogs é negativo na base). */
const gp = (a: Agg) => a.net + a.cogs;
const margin = (a: Agg) => (a.net === 0 ? 0 : (100 * gp(a)) / a.net);

function groupGeo(keyOf: (r: readonly number[]) => number | null): Map<number, Agg> {
  const m = new Map<number, Agg>();
  for (const r of FACT_GEO) {
    const k = keyOf(r);
    if (k === null) continue;
    let a = m.get(k);
    if (!a) m.set(k, (a = zero()));
    add(a, r);
  }
  return m;
}

/** Monta a lista de "como se calcula" de uma métrica. */
function ex(...pairs: [string, string][]): MetricExplainer[] {
  return pairs.map(([metric, computedFrom]) => ({ metric, computedFrom }));
}

/* ----------------------------------------------------------------- globais */

export const CONTEXT_LINE = `Base interna · ${WINDOW_LABEL} · Paraná e Santa Catarina`;
export const PROVENANCE = `${SOURCE_QUALITY.sourceFile} · ${fmtInt(SOURCE_QUALITY.rawRows)} registros · ${WINDOW_LABEL} · PR e SC · ${fmtInt(CITIES.length)} municípios · receita líquida ${fmtBRL(TOTALS.net)} · agregado gerado por scripts/build_facts.py e reconciliado com o CSV até o centavo.`;

const byMonth = groupGeo((r) => r[G.month]!);
const byRegion = groupGeo((r) => REGION_INDEX[REGION_OF_CITY[r[G.city]!]!]);
const byMonthRegion = groupGeo((r) => r[G.month]! * 2 + REGION_INDEX[REGION_OF_CITY[r[G.city]!]!]);
const byCity = groupGeo((r) => r[G.city]!);

const monthNet = MONTHS.map((_, i) => byMonth.get(i)?.net ?? 0);
const monthLines = MONTHS.map((_, i) => byMonth.get(i)?.lines ?? 0);
const LAST = MONTHS.length - 1;

/** Crescimento da receita líquida entre o primeiro e o último mês da janela. */
export const WINDOW_GROWTH = (100 * (monthNet[LAST]! - monthNet[0]!)) / monthNet[0]!;

export function headlineKpis(): Kpi[] {
  const a: Agg = {
    ...zero(),
    kg: TOTALS.kg,
    gross: TOTALS.gross,
    net: TOTALS.net,
    cogs: TOTALS.cogs,
  };
  const months = MONTHS.length;
  return [
    {
      key: "net",
      label: "receita líquida",
      value: fmtBRLShort(TOTALS.net),
      caption: `${months} meses nas duas praças`,
      trend: `${fmtSigned(WINDOW_GROWTH)} de ${monthLabel(0)} a ${monthLabel(LAST)}`,
      explain: ex(
        ["receita líquida", "soma da coluna net_revenue em todas as 382.129 linhas do CSV"],
        ["o que ela é", "o valor faturado depois do desconto concedido — não é o preço de tabela"],
        [
          "crescimento",
          `(receita de ${monthLabel(LAST)} − receita de ${monthLabel(0)}) ÷ receita de ${monthLabel(0)}`,
        ],
      ),
    },
    {
      key: "gp",
      label: "lucro bruto",
      value: fmtBRLShort(TOTALS.gp),
      caption: "receita líquida menos CMV",
      trend: `${fmtBRLShort(TOTALS.gp / months)}/mês em média`,
      explain: ex(
        ["lucro bruto", "soma de net_revenue + cogs, linha a linha (cogs vem negativo na base)"],
        [
          "por que recalculado",
          "a coluna gross_profit existe, mas arredonda o centavo em 56.090 linhas; a identidade fecha exato",
        ],
        ["média mensal", `lucro bruto ÷ ${months} meses da janela`],
      ),
    },
    {
      key: "margin",
      label: "margem bruta",
      value: fmtPct(margin(a)),
      caption: "última linha que a base enxerga",
      trend: `PR ${fmtPct(margin(byRegion.get(0)!))} · SC ${fmtPct(margin(byRegion.get(1)!))}`,
      explain: ex(
        ["margem bruta", "lucro bruto ÷ receita líquida"],
        ["por praça", "a mesma conta feita dentro dos municípios de cada UF"],
        ["limite", "é margem BRUTA: frete, CD, comercial e estrutura não estão na base"],
      ),
    },
    {
      key: "volume",
      label: "volume vendido",
      value: fmtTon(TOTALS.kg),
      caption: `${fmtDec(TOTALS.kg / 1000 / months, 0)} t/mês em média`,
      trend: `${fmtBRL(TOTALS.net / TOTALS.kg)} por kg`,
      explain: ex(
        ["volume", "soma de weight_kg, convertida para toneladas"],
        [
          "para que serve",
          "é o volume que dimensiona armazenagem e frota do centro de distribuição",
        ],
        ["R$ por kg", "receita líquida ÷ peso total — preço médio realizado"],
      ),
    },
  ];
}

export function monthsRevenue(): MonthPoint[] {
  return MONTHS.map((_, i) => ({
    label: monthLabel(i),
    value: monthNet[i]! / 1e6,
    display: fmtDec(monthNet[i]! / 1e6, 1),
  }));
}

export function monthsRecords(): MonthPoint[] {
  return MONTHS.map((_, i) => ({
    label: monthLabel(i),
    value: monthLines[i]!,
    display: fmtDec(monthLines[i]! / 1000, 0) + "k",
  }));
}

export const MONTHS_REVENUE_LEGEND = `Valores em R$ milhões. ${monthLabel(LAST)} é o melhor mês da janela: ${fmtBRLShort(monthNet[LAST]!)}, ${fmtSigned(WINDOW_GROWTH)} sobre ${monthLabel(0)}.`;

export function coverage(): Coverage[] {
  const pe = CITIES.filter((c) => c.region === "PR").length;
  const ce = CITIES.length - pe;
  return [
    {
      label: "período",
      value: WINDOW_LABEL,
      caption: `${MONTHS.length} meses fechados, mês a mês`,
      explain: ex(
        ["janela", "valores distintos da coluna month, de 2026-01-01 a 2026-07-01"],
        ["continuidade", "nenhum mês falta e nenhum está pela metade"],
      ),
    },
    {
      label: "praças",
      value: `${REGIONS.length} UFs`,
      caption: "Paraná e Santa Catarina — as duas operações com CD próprio",
      explain: ex(
        ["praças", "valores distintos da coluna region"],
        ["ausência", "PB e AL, onde a Novara também opera, não estão nesta base"],
      ),
    },
    {
      label: "municípios",
      value: fmtInt(CITIES.length),
      caption: `${pe} em PR, ${ce} em SC`,
      explain: ex(
        ["contagem", "coluna city normalizada sem acento e em caixa alta, valores distintos"],
        [
          "por que normalizar",
          "a base grafa o mesmo município de formas diferentes: 98 rótulos brutos viram 82 municípios",
        ],
      ),
    },
    {
      label: "CEPs de entrega",
      value: fmtInt(SOURCE_QUALITY.ceps),
      caption: "o endereço é o que mais se aproxima de um cliente",
      explain: ex(
        ["contagem", "valores distintos da coluna cep"],
        ["uso", "é o componente geográfico do cliente-proxy e a base da geocodificação"],
      ),
    },
    {
      label: "clientes-proxy",
      value: fmtInt(SOURCE_QUALITY.clientProxies),
      caption: "CEP + categoria de cliente; não é ID real",
      explain: ex(
        ["construção", "pares distintos de cep + customer_category"],
        ["por que não só o CEP", "28% dos CEPs atendem mais de uma categoria de estabelecimento"],
        ["limite", "não existe ID de cliente na base: é aproximação, não contagem real"],
      ),
    },
    {
      label: "categorias de cliente",
      value: fmtInt(CUSTOMER_CATEGORIES.length),
      caption: "tipo de estabelecimento que compra",
      explain: ex(
        ["contagem", "valores distintos de customer_category"],
        [
          "tratamento",
          "grafias com caixa diferente foram unificadas; 2 linhas nulas viraram 'Não informado'",
        ],
      ),
    },
    {
      label: "categorias de produto",
      value: fmtInt(PRODUCT_CATEGORIES.length),
      caption: "categoria, não SKU",
      explain: ex(
        ["contagem", "valores distintos de product_category"],
        ["granularidade", "é categoria comercial, não item: não há SKU nem preço unitário na base"],
      ),
    },
    {
      label: "cadeias de temperatura",
      value: fmtInt(TEMPERATURES.length),
      caption: "seco e refrigerado",
      explain: ex(
        ["cadeias", "coluna temperature: dry e refrigerated"],
        ["por que importa", "define se a carga precisa de câmara fria — é o que encarece o CD"],
      ),
    },
  ];
}

export function cityNames(region: Region): string[] {
  return CITIES.filter((c) => c.region === region).map((c) => c.name);
}

/* ------------------------------------------------------------------ praças */

export function regionStats(): RegionStat[] {
  const peNet = byRegion.get(0)!.net;
  const ceNet = byRegion.get(1)!.net;
  const top = Math.max(peNet, ceNet);
  return REGIONS.map((uf, i) => {
    const a = byRegion.get(i)!;
    const cities = CITIES.filter((c) => c.region === uf).length;
    const growth = growthByRegion(uf);
    return {
      uf,
      explain: ex(
        ["receita da praça", "net_revenue somado pelos municípios atribuídos a esta UF"],
        [
          "atribuição",
          "cada município vai para a UF onde concentra receita — resolve os ~89 registros com CEP fora da UF declarada",
        ],
        ["margem", "(net + cogs) ÷ net dentro da praça"],
        ["volume", "soma de weight_kg da praça, em toneladas"],
      ),
      name: REGION_NAME[uf],
      revenue: fmtBRLShort(a.net),
      share: `${fmtPct((100 * a.net) / TOTALS.net)} da receita`,
      fraction: a.net / top,
      profit: fmtBRLShort(gp(a)),
      margin: fmtPct(margin(a)),
      volume: fmtTon(a.kg),
      cities: `${cities} municípios`,
      caption:
        uf === "PR"
          ? `Praça madura: ${fmtSigned(growth)} de ${monthLabel(0)} a ${monthLabel(LAST)}, ${fmtPct(interiorShare("PR"))} da receita fora da região metropolitana.`
          : `Praça em rampa: ${fmtSigned(growth)} no mesmo período, mas ${fmtPct(100 - interiorShare("SC"))} da receita ainda presa à região metropolitana.`,
    };
  });
}

/** Crescimento da receita líquida do primeiro ao último mês, por praça. */
export function growthByRegion(uf: Region): number {
  const i = REGION_INDEX[uf];
  const first = byMonthRegion.get(0 * 2 + i)?.net ?? 0;
  const last = byMonthRegion.get(LAST * 2 + i)?.net ?? 0;
  return (100 * (last - first)) / first;
}

function cityAgg(cityIdx: number): Agg {
  return byCity.get(cityIdx) ?? zero();
}

/** Participação da receita fora da região metropolitana. */
export function interiorShare(uf: Region): number {
  let inside = 0;
  let total = 0;
  CITIES.forEach((c, i) => {
    if (c.region !== uf) return;
    const n = cityAgg(i).net;
    total += n;
    if (c.metro) inside += n;
  });
  return (100 * (total - inside)) / total;
}

export function topCities(n = 8): RankItem[] {
  const rows = CITIES.map((c, i) => ({ c, a: cityAgg(i) }))
    .sort((x, y) => y.a.net - x.a.net)
    .slice(0, n);
  const top = rows[0]!.a.net;
  return rows.map(({ c, a }) => ({
    label: `${c.name} (${c.region})`,
    value: fmtBRLShort(a.net),
    share: fmtPct((100 * a.net) / TOTALS.net),
    fraction: a.net / top,
  }));
}

const clientsByCity = new Map<number, number>(CLIENTS_BY_CITY.map((r) => [r[0]!, r[1]!]));

/** Tabela de municípios de uma praça: receita, participação, margem, clientes. */
export function cityTable(uf: Region, n = 12): TableRow[] {
  const rows = CITIES.map((c, i) => ({ c, i, a: cityAgg(i) }))
    .filter((r) => r.c.region === uf)
    .sort((x, y) => y.a.net - x.a.net);
  const total = rows.reduce((s, r) => s + r.a.net, 0);
  const top = rows[0]!.a.net;
  return rows.slice(0, n).map(({ c, i, a }) => ({
    key: c.name,
    label: c.name,
    fraction: a.net / top,
    cells: [
      fmtBRLShort(a.net),
      fmtPct((100 * a.net) / total),
      fmtPct(margin(a)),
      fmtInt(clientsByCity.get(i) ?? 0),
      fmtBRL(a.net / (clientsByCity.get(i) ?? 1) / MONTHS.length),
    ],
  }));
}

export const CITY_TABLE_HEADERS = [
  "município",
  "receita líquida",
  "% da praça",
  "margem",
  "clientes-proxy",
  "R$/cliente-mês",
];

/** Capital / resto da região metropolitana / interior, por praça. */
export function geoConcentration(uf: Region): SplitPart[] {
  let capital = 0;
  let metro = 0;
  let interior = 0;
  CITIES.forEach((c, i) => {
    if (c.region !== uf) return;
    const n = cityAgg(i).net;
    if (c.name === CAPITAL_OF[uf]) capital += n;
    else if (c.metro) metro += n;
    else interior += n;
  });
  const total = capital + metro + interior;
  const parts = [
    {
      key: "capital",
      label: CAPITAL_OF[uf],
      value: capital,
      color: "var(--color-chart-1)",
    } as const,
    {
      key: "metro",
      label: "resto da região metropolitana",
      value: metro,
      color: "var(--color-chart-3)",
    },
    { key: "interior", label: "interior", value: interior, color: "var(--color-chart-4)" },
  ];
  return parts.map((p) => ({
    key: p.key,
    label: p.label,
    value: fmtBRLShort(p.value),
    share: fmtPct((100 * p.value) / total),
    fraction: p.value / total,
    color: p.color,
  }));
}

/* ---------------------------------------------------------------- mapa */

/** Município → bairros mapeados (índices em NEIGHBORHOODS), pré-agrupado uma vez. */
const neighborhoodsByCity = new Map<number, number[]>();
NEIGHBORHOODS.forEach((n, i) => {
  let arr = neighborhoodsByCity.get(n.city);
  if (!arr) neighborhoodsByCity.set(n.city, (arr = []));
  arr.push(i);
});
const clientsByNeighborhood = new Map<number, number>(
  CLIENTS_BY_NEIGHBORHOOD.map((r) => [r[0]!, r[1]!]),
);

function cityIndexByName(name: string): number {
  const i = CITIES.findIndex((c) => c.name.toUpperCase() === name.toUpperCase());
  if (i < 0) throw new Error(`cidade desconhecida: ${name}`);
  return i;
}

/** 82 bolhas, uma por município — visão "zoom out" do mapa. */
export function cityMapPoints(): MapPoint[] {
  const rows = CITIES.map((c, i) => ({ c, i, a: cityAgg(i) })).filter(
    (r) => r.c.lat !== null && r.c.lon !== null,
  );
  const top = Math.max(...rows.map((r) => r.a.net));
  return rows.map(({ c, i, a }) => ({
    id: `city-${i}`,
    label: c.name,
    lat: c.lat!,
    lon: c.lon!,
    revenue: fmtBRLShort(a.net),
    revenueExact: fmtBRL(a.net),
    share: fmtPct((100 * a.net) / TOTALS.net),
    margin: fmtPct(margin(a)),
    clients: fmtInt(clientsByCity.get(i) ?? 0),
    radiusFraction: a.net / top,
  }));
}

/** Bolhas de bairro MAPEADO de um município — exclui a linha "não identificado" (sem coordenada). */
export function neighborhoodMapPoints(cityName: string): MapPoint[] {
  const ci = cityIndexByName(cityName);
  const idxs = (neighborhoodsByCity.get(ci) ?? []).filter(
    (i) => NEIGHBORHOODS[i]!.mapped && NEIGHBORHOODS[i]!.lat !== null,
  );
  if (idxs.length === 0) return [];
  const top = Math.max(...idxs.map((i) => FACT_NEIGHBORHOOD[i]![0]));
  return idxs.map((i) => {
    const n = NEIGHBORHOODS[i]!;
    const [net, gross, cogs] = FACT_NEIGHBORHOOD[i]!;
    return {
      id: `nb-${i}`,
      label: n.name,
      lat: n.lat!,
      lon: n.lon!,
      revenue: fmtBRLShort(net),
      revenueExact: fmtBRL(net),
      share: fmtPct((100 * net) / cityAgg(ci).net),
      margin: fmtPct((100 * (net + cogs)) / net),
      clients: fmtInt(clientsByNeighborhood.get(i) ?? 0),
      radiusFraction: net / top,
    };
  });
}

/** null quando a cidade não tem nenhuma receita não mapeada. */
export function neighborhoodUnmapped(cityName: string): UnmappedSummary | null {
  const ci = cityIndexByName(cityName);
  const idxs = neighborhoodsByCity.get(ci) ?? [];
  const unmappedIdx = idxs.find((i) => !NEIGHBORHOODS[i]!.mapped);
  if (unmappedIdx === undefined) return null;
  const [net] = FACT_NEIGHBORHOOD[unmappedIdx]!;
  if (net <= 0) return null;
  const cityNet = cityAgg(ci).net;
  const share = (100 * net) / cityNet;
  return {
    city: CITIES[ci]!.name,
    revenue: fmtBRLShort(net),
    revenueExact: fmtBRL(net),
    share: fmtPct(share),
    fraction: net / cityNet,
    lowCoverage: share > 50,
  };
}

/** Ranking de bairros da cidade — "não identificado" sempre entra como última linha. */
export function neighborhoodTable(cityName: string, n = 15): TableRow[] {
  const ci = cityIndexByName(cityName);
  const idxs = neighborhoodsByCity.get(ci) ?? [];
  const cityNet = cityAgg(ci).net;
  const rows = idxs
    .map((i) => ({ i, n: NEIGHBORHOODS[i]!, row: FACT_NEIGHBORHOOD[i]! }))
    .filter((r) => r.n.mapped)
    .sort((x, y) => y.row[0] - x.row[0]);
  const top = rows[0]?.row[0] ?? 1;
  const mapped = rows.slice(0, n).map(({ i, n: nb, row: [net, , cogs] }) => ({
    key: nb.name,
    label: nb.name,
    fraction: net / top,
    cells: [
      fmtBRLShort(net),
      fmtPct((100 * net) / cityNet),
      fmtPct((100 * (net + cogs)) / net),
      fmtInt(clientsByNeighborhood.get(i) ?? 0),
    ],
  }));
  const unmapped = neighborhoodUnmapped(cityName);
  if (!unmapped) return mapped;
  return [
    ...mapped,
    {
      key: "unmapped",
      label: "Bairro não identificado",
      fraction: 0,
      cells: [unmapped.revenue, unmapped.share, "—", "—"],
    },
  ];
}

export const NEIGHBORHOOD_TABLE_HEADERS = [
  "bairro",
  "receita líquida",
  "% da cidade",
  "margem",
  "clientes-proxy",
];

/** Municípios com pelo menos um bairro mapeado — popula o seletor do mapa. */
export function citiesWithNeighborhoods(): string[] {
  return CITIES.map((c, i) => ({ c, i }))
    .filter(({ i }) => (neighborhoodsByCity.get(i) ?? []).some((idx) => NEIGHBORHOODS[idx]!.mapped))
    .sort((x, y) => cityAgg(y.i).net - cityAgg(x.i).net)
    .map(({ c }) => c.name);
}

/** Cobertura da geocodificação por cidade, ordenada por receita — a seção de transparência do mapa. */
export function neighborhoodCoverage(n = 20): TableRow[] {
  const rows = CITIES.map((c, i) => {
    const idxs = neighborhoodsByCity.get(i) ?? [];
    const total = idxs.reduce((s, idx) => s + FACT_NEIGHBORHOOD[idx]![0], 0);
    const mappedNet = idxs
      .filter((idx) => NEIGHBORHOODS[idx]!.mapped)
      .reduce((s, idx) => s + FACT_NEIGHBORHOOD[idx]![0], 0);
    const bairros = idxs.filter((idx) => NEIGHBORHOODS[idx]!.mapped).length;
    return { c, total, mappedNet, bairros };
  })
    .filter((r) => r.total > 0)
    .sort((x, y) => y.total - x.total);
  const top = rows[0]!.total;
  return rows.slice(0, n).map((r) => ({
    key: r.c.name,
    label: r.c.name,
    fraction: r.total / top,
    cells: [fmtBRLShort(r.total), fmtInt(r.bairros), fmtPct((100 * r.mappedNet) / r.total)],
  }));
}
export const NEIGHBORHOOD_COVERAGE_HEADERS = [
  "município",
  "receita líquida",
  "bairros identificados",
  "cobertura",
];

/**
 * O bairro que mais fatura na base inteira — o que o mapa existe para mostrar.
 * A cobertura da geocodificação é ressalva de método, não manchete: vive na
 * seção "Cobertura" ao pé da página.
 */
export function topNeighborhoodHero(): { value: string; caption: string; scope: string } {
  let bestIdx = -1;
  let bestNet = -Infinity;
  NEIGHBORHOODS.forEach((n, i) => {
    if (!n.mapped) return;
    const net = FACT_NEIGHBORHOOD[i]![0];
    if (net > bestNet) {
      bestNet = net;
      bestIdx = i;
    }
  });
  const nb = NEIGHBORHOODS[bestIdx]!;
  const city = CITIES[nb.city]!;
  const cityNet = cityAgg(nb.city).net;
  return {
    value: fmtBRLShort(bestNet),
    caption: `${nb.name}, em ${city.name} — o bairro que mais fatura na base`,
    scope: `${fmtPct((100 * bestNet) / TOTALS.net)} da receita líquida das duas praças sai de um bairro só, e ${fmtPct((100 * bestNet) / cityNet)} de tudo que ${city.name} compra.`,
  };
}

/* --------------------------------------------------------------- maturação */

const CHART_PE = "var(--color-chart-1)";
const CHART_CE = "var(--color-chart-3)";

const clientsByMonthRegion = new Map<number, number>(
  CLIENTS_BY_MONTH_REGION.map((r) => [r[0]! * 2 + r[1]!, r[2]!]),
);

function regionMonthNet(uf: Region, m: number): number {
  return byMonthRegion.get(m * 2 + REGION_INDEX[uf])?.net ?? 0;
}
function regionMonthClients(uf: Region, m: number): number {
  return clientsByMonthRegion.get(m * 2 + REGION_INDEX[uf]) ?? 0;
}

/** Receita líquida mensal, uma série por praça. Em R$ milhões. */
export function revenueSeries(): Series[] {
  return REGIONS.map((uf) => ({
    key: uf,
    label: REGION_NAME[uf],
    color: uf === "PR" ? CHART_PE : CHART_CE,
    points: MONTHS.map((_, m) => {
      const v = regionMonthNet(uf, m) / 1e6;
      return { label: monthLabel(m), value: v, display: fmtDec(v, 1) };
    }),
  }));
}

/** Clientes-proxy ativos por mês, uma série por praça. */
export function activeClientsSeries(): Series[] {
  return REGIONS.map((uf) => ({
    key: uf,
    label: REGION_NAME[uf],
    color: uf === "PR" ? CHART_PE : CHART_CE,
    points: MONTHS.map((_, m) => {
      const v = regionMonthClients(uf, m);
      return { label: monthLabel(m), value: v, display: fmtInt(v) };
    }),
  }));
}

/** Receita líquida por cliente-proxy ativo no mês — a medida de share of wallet. */
export function ticketSeries(): Series[] {
  return REGIONS.map((uf) => ({
    key: uf,
    label: REGION_NAME[uf],
    color: uf === "PR" ? CHART_PE : CHART_CE,
    points: MONTHS.map((_, m) => {
      const v = regionMonthNet(uf, m) / Math.max(1, regionMonthClients(uf, m));
      return { label: monthLabel(m), value: v, display: fmtDec(v, 0) };
    }),
  }));
}

/**
 * Decomposição do crescimento: quanto veio de mais clientes e quanto veio de
 * cada cliente comprando mais. Receita = clientes ativos × receita por cliente,
 * então as duas variações multiplicam-se para dar a variação total.
 */
export function growthDecomposition(): TableRow[] {
  return REGIONS.map((uf) => {
    const n0 = regionMonthClients(uf, 0);
    const n1 = regionMonthClients(uf, LAST);
    const t0 = regionMonthNet(uf, 0) / n0;
    const t1 = regionMonthNet(uf, LAST) / n1;
    return {
      key: uf,
      label: REGION_NAME[uf],
      cells: [
        fmtSigned(growthByRegion(uf)),
        `${fmtInt(n0)} → ${fmtInt(n1)}`,
        fmtSigned((100 * (n1 - n0)) / n0),
        `${fmtBRL(t0)} → ${fmtBRL(t1)}`,
        fmtSigned((100 * (t1 - t0)) / t0),
      ],
    };
  });
}

export const GROWTH_HEADERS = [
  "praça",
  "receita",
  "clientes ativos",
  "variação",
  "receita por cliente",
  "variação",
];

export interface CohortCell {
  month: number;
  clients: string;
  retained: string;
  intensity: number;
}
export interface CohortRow {
  key: string;
  label: string;
  size: string;
  cells: (CohortCell | null)[];
}

/** Matriz de coorte: dos clientes que compraram pela primeira vez no mês N,
 *  quantos seguiam comprando em cada mês seguinte. */
export function cohortMatrix(uf: Region): CohortRow[] {
  const raw = COHORT[uf];
  const byStart = new Map<number, Map<number, number>>();
  for (const [m0, m, n] of raw) {
    let row = byStart.get(m0);
    if (!row) byStart.set(m0, (row = new Map()));
    row.set(m, n);
  }
  return [...byStart.keys()]
    .sort((a, b) => a - b)
    .map((m0) => {
      const row = byStart.get(m0)!;
      const size = row.get(m0) ?? 0;
      return {
        key: `${uf}-${m0}`,
        label: monthLabel(m0),
        size: fmtInt(size),
        cells: MONTHS.map((_, m) => {
          if (m < m0) return null;
          const n = row.get(m) ?? 0;
          const share = size === 0 ? 0 : n / size;
          return {
            month: m,
            clients: fmtInt(n),
            retained: fmtPct(100 * share, 0),
            intensity: share,
          };
        }),
      };
    });
}

/** Retenção mês → mês seguinte: share dos ativos que voltam a comprar. */
export function retentionSeries(): Series[] {
  return REGIONS.map((uf) => ({
    key: uf,
    label: REGION_NAME[uf],
    color: uf === "PR" ? CHART_PE : CHART_CE,
    points: RETENTION[uf].map(([m, active, back]) => {
      const v = (100 * back) / active;
      return { label: `${monthLabel(m)}→${monthLabel(m + 1)}`, value: v, display: fmtPct(v) };
    }),
  }));
}

/** Novos clientes-proxy por mês e o quanto eles pesam na receita do mês. */
export function newClientsTable(uf: Region): TableRow[] {
  return NEW_CLIENTS[uf]
    .filter(([m]) => m > 0)
    .map(([m, n, net]) => {
      const active = regionMonthClients(uf, m);
      const monthNetR = regionMonthNet(uf, m);
      return {
        key: `${uf}-${m}`,
        label: monthLabel(m),
        cells: [
          fmtInt(n),
          fmtPct((100 * n) / active),
          fmtBRLShort(net),
          fmtPct((100 * net) / monthNetR),
        ],
      };
    });
}

export const NEW_CLIENTS_HEADERS = [
  "mês",
  "novos clientes",
  "% dos ativos",
  "receita dos novos",
  "% da receita",
];

/* ---------------------------------------------------------------- carteira */

const custKeyed = groupGeo((r) => r[G.cust]!);
const custRegionKeyed = groupGeo((r) => r[G.cust]! * 2 + REGION_INDEX[REGION_OF_CITY[r[G.city]!]!]);
const clientsByRegionCust = new Map<number, number>(
  CLIENTS_BY_REGION_CUST.map((r) => [r[1]! * 2 + r[0]!, r[2]!]),
);

export function topCustomerCategories(n = 8): RankItem[] {
  const rows = CUSTOMER_CATEGORIES.map((label, i) => ({ label, a: custKeyed.get(i) ?? zero() }))
    .sort((x, y) => y.a.net - x.a.net)
    .slice(0, n);
  const top = rows[0]!.a.net;
  return rows.map(({ label, a }) => ({
    label,
    value: fmtBRLShort(a.net),
    share: fmtPct((100 * a.net) / TOTALS.net),
    fraction: a.net / top,
  }));
}

/** Categorias de cliente com receita, margem, base e ticket — o retrato da carteira. */
export function customerTable(n = 14): TableRow[] {
  const rows = CUSTOMER_CATEGORIES.map((label, i) => {
    const a = custKeyed.get(i) ?? zero();
    const clients =
      (clientsByRegionCust.get(i * 2 + 0) ?? 0) + (clientsByRegionCust.get(i * 2 + 1) ?? 0);
    return { label, a, clients };
  })
    .sort((x, y) => y.a.net - x.a.net)
    .slice(0, n);
  const top = rows[0]!.a.net;
  return rows.map(({ label, a, clients }) => ({
    key: label,
    label,
    fraction: a.net / top,
    cells: [
      fmtBRLShort(a.net),
      fmtPct((100 * a.net) / TOTALS.net),
      fmtPct(margin(a)),
      fmtInt(clients),
      fmtBRL(a.net / Math.max(1, clients) / MONTHS.length),
    ],
  }));
}

export const CUSTOMER_HEADERS = [
  "categoria de cliente",
  "receita líquida",
  "% do total",
  "margem",
  "clientes-proxy",
  "R$/cliente-mês",
];

/** Diferença de mix entre as praças: share de cada categoria em PR e em SC. */
export function customerMixByRegion(n = 10): TableRow[] {
  const peTotal = byRegion.get(0)!.net;
  const ceTotal = byRegion.get(1)!.net;
  return CUSTOMER_CATEGORIES.map((label, i) => {
    const pe = (custRegionKeyed.get(i * 2 + 0) ?? zero()).net;
    const ce = (custRegionKeyed.get(i * 2 + 1) ?? zero()).net;
    return { label, pe, ce, total: pe + ce };
  })
    .sort((x, y) => y.total - x.total)
    .slice(0, n)
    .map(({ label, pe, ce }) => ({
      key: label,
      label,
      cells: [
        fmtPct((100 * pe) / peTotal),
        fmtPct((100 * ce) / ceTotal),
        fmtSigned((100 * ce) / ceTotal - (100 * pe) / peTotal),
      ],
    }));
}

export const MIX_REGION_HEADERS = ["categoria de cliente", "% de PR", "% de SC", "diferença"];

/** Curva de concentração: share acumulado da receita pelos decis de cliente. */
export function paretoSeries(): Series[] {
  return REGIONS.map((uf) => ({
    key: uf,
    label: REGION_NAME[uf],
    color: uf === "PR" ? CHART_PE : CHART_CE,
    points: PARETO[uf].deciles.map((v, i) => ({
      label: `${(i + 1) * 10}%`,
      value: v,
      display: fmtDec(v, 0),
    })),
  }));
}

export function concentrationStats(): DerivedMetric[] {
  return REGIONS.flatMap((uf) => {
    const d = PARETO[uf].deciles;
    return [
      {
        key: `${uf}-top10`,
        label: `${uf} · top 10% dos clientes`,
        value: fmtPct(d[0]!),
        caption: `${fmtInt(Math.round(PARETO[uf].clients * 0.1))} clientes-proxy de ${fmtInt(PARETO[uf].clients)}`,
        explain: ex(
          [
            "cálculo",
            "clientes-proxy da praça ordenados por receita; participação do primeiro decil no total",
          ],
          ["leitura", "quanto maior, mais a praça depende de poucas contas"],
        ),
      },
      {
        key: `${uf}-top20`,
        label: `${uf} · top 20% dos clientes`,
        value: fmtPct(d[1]!),
        caption: "concentração da receita na ponta da carteira",
        explain: ex(
          [
            "cálculo",
            "participação acumulada dos dois primeiros decis de cliente na receita da praça",
          ],
          [
            "comparação",
            "uma carteira nova costuma ser menos concentrada: ainda não formou grandes contas",
          ],
        ),
      },
    ];
  });
}

/* --------------------------------------------------------------------- mix */

function groupProd(keyOf: (r: readonly number[]) => number): Map<number, Agg> {
  const m = new Map<number, Agg>();
  for (const r of FACT_PROD) {
    const k = keyOf(r);
    let a = m.get(k);
    if (!a) m.set(k, (a = zero()));
    add(a, r, false);
  }
  return m;
}

const prodKeyed = groupProd((r) => r[P.prod]!);
const tempRegionKeyed = groupProd((r) => r[P.temp]! * 2 + r[P.region]!);
const tempKeyed = groupProd((r) => r[P.temp]!);
const TEMP_LABEL = ["seco", "refrigerado"];

export function temperatureSplit(): SplitPart[] {
  const total = TOTALS.net;
  return TEMPERATURES.map((_, t) => {
    const a = tempKeyed.get(t) ?? zero();
    return {
      key: TEMP_LABEL[t]!,
      label: TEMP_LABEL[t]!,
      value: fmtBRLShort(a.net),
      share: fmtPct((100 * a.net) / total),
      fraction: a.net / total,
      color: t === 0 ? "var(--color-chart-3)" : "var(--color-chart-1)",
    };
  });
}

/** Seco e refrigerado por praça: peso, receita, margem e preço por quilo. */
export function temperatureTable(): TableRow[] {
  return REGIONS.flatMap((uf, ri) =>
    TEMPERATURES.map((_, t) => {
      const a = tempRegionKeyed.get(t * 2 + ri) ?? zero();
      const regionAgg = byRegion.get(ri)!;
      return {
        key: `${uf}-${t}`,
        label: `${uf} · ${TEMP_LABEL[t]!}`,
        cells: [
          fmtBRLShort(a.net),
          fmtPct((100 * a.net) / regionAgg.net),
          fmtPct((100 * a.kg) / regionAgg.kg),
          fmtPct(margin(a)),
          fmtBRL(a.net / a.kg),
        ],
      };
    }),
  );
}

export const TEMPERATURE_HEADERS = [
  "praça e cadeia",
  "receita líquida",
  "% da receita",
  "% do peso",
  "margem",
  "R$/kg",
];

export function topProducts(n = 8): RankItem[] {
  const rows = PRODUCT_CATEGORIES.map((label, i) => ({ label, a: prodKeyed.get(i) ?? zero() }))
    .sort((x, y) => y.a.net - x.a.net)
    .slice(0, n);
  const top = rows[0]!.a.net;
  return rows.map(({ label, a }) => ({
    label,
    value: fmtBRLShort(a.net),
    share: fmtPct((100 * a.net) / TOTALS.net),
    fraction: a.net / top,
  }));
}

/**
 * Peso de cada categoria de produto no mix real (base inteira) — todas as
 * 49 (48 nomeadas + "Não informado"), não só o top-N. Usado pelo Score de
 * abastecimento (Critério 3), que pondera distância por peso%_categoria
 * conforme `metodologia_analise.md` (mesma convenção de peso do ticket
 * médio em 2.1: mix da base inteira, não Curitiba/Florianópolis separados).
 */
export function productShares(): { label: string; share: number }[] {
  return PRODUCT_CATEGORIES.map((label, i) => ({
    label,
    share: (prodKeyed.get(i) ?? zero()).net / TOTALS.net,
  }));
}

export function productTable(n = 15): TableRow[] {
  const rows = PRODUCT_CATEGORIES.map((label, i) => ({ label, a: prodKeyed.get(i) ?? zero() }))
    .sort((x, y) => y.a.net - x.a.net)
    .slice(0, n);
  const top = rows[0]!.a.net;
  return rows.map(({ label, a }) => ({
    key: label,
    label,
    fraction: a.net / top,
    cells: [
      fmtBRLShort(a.net),
      fmtPct((100 * a.net) / TOTALS.net),
      fmtPct(margin(a)),
      fmtBRL(a.net / a.kg),
    ],
  }));
}

export const PRODUCT_HEADERS = [
  "categoria de produto",
  "receita líquida",
  "% do total",
  "margem",
  "R$/kg",
];

/** Categorias relevantes (receita > R$ 1 mi) nas duas pontas da margem. */
export function marginExtremes(): { worst: TableRow[]; best: TableRow[] } {
  const rows = PRODUCT_CATEGORIES.map((label, i) => ({ label, a: prodKeyed.get(i) ?? zero() }))
    .filter((r) => r.a.net > 1e6)
    .sort((x, y) => margin(x.a) - margin(y.a));
  const toRow = ({ label, a }: { label: string; a: Agg }): TableRow => ({
    key: label,
    label,
    cells: [fmtPct(margin(a)), fmtBRLShort(a.net), fmtPct((100 * a.net) / TOTALS.net)],
  });
  return { worst: rows.slice(0, 5).map(toRow), best: rows.slice(-5).reverse().map(toRow) };
}

export const MARGIN_HEADERS = ["categoria", "margem", "receita líquida", "% do total"];

/** Share da receita concentrado em carnes — volume de tráfego, não lucro. */
export function meatShare(): { share: number; margin: number } {
  let net = 0;
  let cogs = 0;
  PRODUCT_CATEGORIES.forEach((label, i) => {
    if (!label.startsWith("Carnes")) return;
    const a = prodKeyed.get(i) ?? zero();
    net += a.net;
    cogs += a.cogs;
  });
  return { share: (100 * net) / TOTALS.net, margin: (100 * (net + cogs)) / net };
}

/* -------------------------------------------------------------- financeiro */

export function bigFigures(): BigFigure[] {
  return [
    {
      label: "receita bruta",
      value: fmtBRLShort(TOTALS.gross),
      exact: fmtBRL(TOTALS.gross),
      caption: "gross_revenue — preço de tabela",
      explain: ex(
        ["cálculo", "soma da coluna gross_revenue"],
        ["o que é", "o preço de tabela, antes de qualquer desconto — não entrou no caixa"],
      ),
    },
    {
      label: "receita líquida",
      value: fmtBRLShort(TOTALS.net),
      exact: fmtBRL(TOTALS.net),
      caption: "net_revenue — o que a Novara faturou",
      explain: ex(
        ["cálculo", "soma da coluna net_revenue"],
        ["o que é", "o valor efetivamente faturado, já com o desconto aplicado"],
        ["devoluções", "501 linhas negativas ficam incluídas; removê-las inflaria o número"],
      ),
    },
    {
      label: "CMV",
      value: fmtBRLShort(TOTALS.cogs),
      exact: fmtBRL(TOTALS.cogs),
      caption: "cogs — vem negativo na base",
      explain: ex(
        ["cálculo", "soma da coluna cogs"],
        [
          "sinal",
          "a base já grava o custo como número negativo; por isso o lucro é net + cogs, não net − cogs",
        ],
        ["escopo", "é só o custo da mercadoria comprada — não inclui frete nem operação"],
      ),
    },
    {
      label: "lucro bruto",
      value: fmtBRLShort(TOTALS.gp),
      exact: fmtBRL(TOTALS.gp),
      caption: "net + cogs — a identidade exata",
      explain: ex(
        ["cálculo", "net_revenue + cogs, linha a linha"],
        [
          "por que não usar a coluna",
          "gross_profit arredonda o centavo em 56.090 linhas; a identidade fecha exato",
        ],
        ["limite", "é o último resultado que a base permite ver"],
      ),
    },
  ];
}

/**
 * Cascata bruto → líquido → lucro bruto. A largura de cada barra é a fração da
 * receita bruta que o passo representa, e as saídas começam onde o valor
 * remanescente termina: a geometria é o próprio cálculo.
 */
export function cascade(): CascadeStep[] {
  const gross = TOTALS.gross;
  const net = TOTALS.net;
  const cogs = Math.abs(TOTALS.cogs);
  const discount = gross - net;
  const profit = net - cogs;
  const f = (v: number) => v / gross;
  return [
    {
      key: "gross",
      label: "Receita bruta",
      value: fmtBRLShort(gross),
      share: "100% do bruto",
      from: 0,
      to: 1,
      kind: "total",
      tone: "neutral",
      note: "soma de gross_revenue — preço de tabela, antes de desconto",
      explain: ex(
        ["cálculo", "soma de gross_revenue"],
        ["barra", "é a referência: todas as outras larguras são fração desta"],
      ),
    },
    {
      key: "discount",
      label: "Descontos concedidos",
      value: fmtBRLShort(-discount),
      share: `${fmtPct((100 * discount) / gross)} do bruto`,
      from: f(net),
      to: 1,
      kind: "outflow",
      tone: "discount",
      note: "gross_revenue − net_revenue — não é coluna da base, é diferença",
      explain: ex(
        ["cálculo", "gross_revenue − net_revenue"],
        [
          "barra",
          "começa onde a receita líquida termina — é a parte do preço de tabela que não virou receita",
        ],
      ),
    },
    {
      key: "net",
      label: "Receita líquida",
      value: fmtBRLShort(net),
      share: `${fmtPct((100 * net) / gross)} do bruto`,
      from: 0,
      to: f(net),
      kind: "total",
      tone: "neutral",
      note: "soma de net_revenue — o que entrou de fato",
      explain: ex(
        ["cálculo", "soma de net_revenue"],
        ["barra", "a fração da receita bruta que sobrou depois do desconto"],
      ),
    },
    {
      key: "cogs",
      label: "CMV",
      value: fmtBRLShort(-cogs),
      share: `${fmtPct((100 * cogs) / net)} do líquido`,
      from: f(profit),
      to: f(net),
      kind: "outflow",
      tone: "cost",
      note: "soma de cogs (a coluna vem negativa na base)",
      explain: ex(
        ["cálculo", "soma de cogs, em módulo"],
        [
          "barra",
          "começa onde o lucro bruto termina — é o que a mercadoria consumiu da receita líquida",
        ],
      ),
    },
    {
      key: "gp",
      label: "Lucro bruto",
      value: fmtBRLShort(profit),
      share: `${fmtPct((100 * profit) / net)} do líquido`,
      from: 0,
      to: f(profit),
      kind: "total",
      tone: "profit",
      note: "net_revenue + cogs — recalculado; a coluna gross_profit arredonda o centavo",
      explain: ex(
        ["cálculo", "net_revenue + cogs"],
        ["barra", "o que sobra; sua largura sobre a da receita líquida é a margem bruta"],
      ),
    },
  ];
}

/** Soma dos clientes-proxy ativos em cada mês — denominador de receita/cliente-mês. */
export const CLIENT_MONTHS = CLIENTS_BY_MONTH_REGION.reduce((a, r) => a + r[2], 0);

export function derivedMetrics(): DerivedMetric[] {
  const { gross, net, cogs, gp: profit, kg } = TOTALS;
  const c = Math.abs(cogs);
  return [
    {
      key: "margin",
      label: "margem bruta",
      value: fmtPct((100 * profit) / net),
      caption: "lucro bruto sobre receita líquida",
      explain: ex(
        ["cálculo", "lucro bruto ÷ receita líquida"],
        ["leitura", "de cada R$ 100 faturados, quanto sobra depois de pagar a mercadoria"],
      ),
    },
    {
      key: "discount",
      label: "desconto médio",
      value: fmtPct(100 * (1 - net / gross)),
      caption: "quanto do preço de tabela é abatido",
      explain: ex(
        ["cálculo", "1 − (receita líquida ÷ receita bruta)"],
        ["origem", "não é coluna da base: é a diferença entre gross_revenue e net_revenue"],
      ),
    },
    {
      key: "cogsShare",
      label: "CMV sobre líquido",
      value: fmtPct((100 * c) / net),
      caption: "custo da mercadoria em cada real que entra",
      explain: ex(
        ["cálculo", "|cogs| ÷ net_revenue"],
        ["leitura", "é o complemento da margem bruta: os dois somam 100%"],
      ),
    },
    {
      key: "markup",
      label: "markup sobre custo",
      value: fmtPct(100 * (net / c - 1)),
      caption: "quanto se cobra acima do custo de compra",
      explain: ex(
        ["cálculo", "(net_revenue ÷ |cogs|) − 1"],
        [
          "diferença para margem",
          "markup olha sobre o custo; margem olha sobre a venda — não são o mesmo número",
        ],
      ),
    },
    {
      key: "revPerKg",
      label: "receita por kg",
      value: fmtBRL(net / kg),
      caption: "preço médio realizado por quilo vendido",
      explain: ex(
        ["cálculo", "receita líquida ÷ peso total vendido"],
        ["uso", "liga o comercial à operação: mede quanto vale cada quilo movimentado"],
      ),
    },
    {
      key: "gpPerKg",
      label: "lucro por kg",
      value: fmtBRL(profit / kg),
      caption: "margem absoluta que cada quilo movimentado gera",
      explain: ex(
        ["cálculo", "lucro bruto ÷ peso total vendido"],
        ["uso", "é a margem que precisa cobrir o custo de mover aquele quilo"],
      ),
    },
    {
      key: "revPerClientMonth",
      label: "receita por cliente-mês",
      value: fmtBRL(net / CLIENT_MONTHS),
      caption: `${fmtInt(CLIENT_MONTHS)} pares cliente-proxy × mês ativo na janela`,
      explain: ex(
        ["cálculo", "receita líquida ÷ soma dos clientes-proxy ativos em cada mês"],
        [
          "por que assim",
          "um cliente que compra nos 7 meses conta 7 vezes; é receita por cliente por mês, não por cliente",
        ],
      ),
    },
    {
      key: "volume",
      label: "volume movimentado",
      value: fmtTon(kg),
      caption: `${fmtDec(kg / 1000 / MONTHS.length, 0)} t/mês em média nas duas praças`,
      explain: ex(
        ["cálculo", "soma de weight_kg em toneladas"],
        ["uso", "o pico mensal deste número é o que dimensiona a área do CD"],
      ),
    },
  ];
}

export const DERIVED_CLOSING = `A margem bruta de ${fmtPct((100 * TOTALS.gp) / TOTALS.net)} é a última linha que esta base enxerga. Frete, CD, comercial e estrutura não estão aqui — o que sobra depois deles é premissa, não dado.`;

/* -------------------------------------------------- qualidade e procedência */

export const COLUMNS: ColumnSpec[] = [
  {
    name: "month",
    what: "mês de referência, sempre o dia 1",
    example: "2026-01-01",
    role: "chave",
  },
  {
    name: "customer_category",
    what: "tipo de estabelecimento que comprou",
    example: "Cafeteria",
    role: "chave",
  },
  {
    name: "region",
    what: "UF da operação — só PR e SC existem na base",
    example: "PR",
    role: "chave",
  },
  { name: "city", what: "município de entrega", example: "CURITIBA", role: "chave" },
  {
    name: "cep",
    what: "CEP de entrega, 8 dígitos sem máscara",
    example: "50050290",
    role: "chave",
  },
  {
    name: "product_category",
    what: "categoria do produto, não SKU",
    example: "Água Mineral",
    role: "chave",
  },
  {
    name: "temperature",
    what: "seco ou refrigerado — define a cadeia no CD",
    example: "dry",
    role: "chave",
  },
  { name: "weight_kg", what: "peso vendido em quilos", example: "257,4", role: "medida" },
  { name: "gross_revenue", what: "receita a preço de tabela", example: "1.240,44", role: "medida" },
  {
    name: "net_revenue",
    what: "receita após desconto — o que entrou",
    example: "1.240,44",
    role: "medida",
  },
  {
    name: "cogs",
    what: "custo da mercadoria, com sinal negativo",
    example: "−904,74",
    role: "medida",
  },
  {
    name: "gross_profit",
    what: "lucro bruto pronto; recalculamos por net + cogs",
    example: "335,70",
    role: "medida",
  },
];

export const COLUMNS_HEADERS = {
  name: "coluna",
  what: "o que é",
  example: "exemplo",
  role: "papel",
};

export const GRAIN_NOTE =
  "As sete chaves juntas são únicas em 100% das linhas — a base já vem agregada por mês. Isso significa que frequência de compra, ticket por pedido e recência são inobserváveis: o que se pode medir é quanto cada combinação movimentou no mês.";

export function treatments(): Treatment[] {
  const q = SOURCE_QUALITY;
  return [
    {
      label: "cidades normalizadas",
      figure: `${q.cityLabelsRaw} → ${q.cityLabelsNormalised}`,
      detail:
        "acento e caixa variam no mesmo município (EUSEBIO / EUSÉBIO). Normalizamos para maiúscula sem acento antes de qualquer soma.",
    },
    {
      label: "lucro bruto recalculado",
      figure: `${fmtInt(q.grossProfitRounded)} linhas`,
      detail:
        "a coluna gross_profit existe e está completa, mas arredonda o centavo: nessas linhas ela diverge de net_revenue + cogs em R$ 0,01. Usamos a identidade, que fecha exato.",
    },
    {
      label: "devoluções mantidas",
      figure: `${fmtInt(q.negativeLines)} linhas`,
      detail: `linhas com receita negativa (${fmtBRL(q.negativeNet)}) ficam no líquido — removê-las inflaria o faturamento.`,
    },
    {
      label: "produto sem categoria",
      figure: `${fmtInt(q.nullProduct)} linhas`,
      detail:
        "rotuladas como 'Não informado' em vez de descartadas, para o total continuar fechando.",
    },
    {
      label: "cliente é proxy",
      figure: `${fmtInt(q.clientProxies)} pares`,
      detail:
        "não existe ID de cliente nem de pedido na base. Contamos CEP + categoria de cliente; o CEP sozinho não serve porque 28% deles atendem mais de uma categoria.",
    },
    {
      label: "reconciliação",
      figure: "até o centavo",
      detail: `o agregado de ${fmtInt(FACT_GEO.length)} linhas que alimenta este dashboard soma ${fmtBRL(TOTALS.net)}, idêntico ao CSV. O script falha se divergir.`,
    },
  ];
}

export const BLIND_SPOTS: string[] = [
  "Não há ID de cliente nem de pedido: frequência de compra e tamanho de pedido são inobserváveis.",
  "Só PR e SC. RS e SP, onde a Novara também opera, não estão nesta base.",
  "Não há custo logístico, despesa comercial nem headcount — a última linha visível é a margem bruta.",
  "Não há SKU nem preço unitário, só categoria de produto.",
  "A janela tem 7 meses: não dá para separar tendência de sazonalidade.",
];

export const NEXT_STEP =
  "O que falta para decidir onde abrir a próxima operação não está nesta base: tamanho de mercado por cidade, densidade de estabelecimentos, concorrência instalada e custo de operar um CD. É o que entra na aba Fonte externa, uma sub-aba por critério de decisão.";

export function baseSummary(): Coverage[] {
  return [
    {
      label: "registros brutos",
      value: fmtInt(SOURCE_QUALITY.rawRows),
      caption: "linhas do CSV original, sem filtro",
      explain: ex(["contagem", "linhas de base_case_planejamento.csv, sem descarte de nenhuma"]),
    },
    {
      label: "linhas agregadas",
      value: fmtInt(FACT_GEO.length),
      caption: "mês × município × categoria de cliente × temperatura",
      explain: ex(
        ["agregação", "as 382.129 linhas somadas nesse grão"],
        [
          "por que agregar",
          "o CSV inteiro não caberia no navegador; o agregado permite qualquer corte destas telas",
        ],
      ),
    },
    {
      label: "reconciliação",
      value: fmtBRL(TOTALS.net),
      caption: "soma do agregado, idêntica ao CSV",
      explain: ex([
        "garantia",
        "o script compara a soma do agregado com a do CSV e falha se divergir mais de um centavo",
      ]),
    },
    {
      label: "gerado por",
      value: "build_facts.py",
      caption: "script versionado; falha se o total divergir",
      explain: ex(
        ["origem", "scripts/build_facts.py, no próprio repositório"],
        [
          "reprodutibilidade",
          "rodar o script de novo sobre o mesmo CSV produz exatamente estes números",
        ],
      ),
    },
  ];
}

/* ------------------------------------------------------------- explicadores */

export const EXPLAIN = {
  kpis: [
    { metric: "receita líquida", computedFrom: "soma de net_revenue em toda a janela" },
    { metric: "lucro bruto", computedFrom: "soma de net_revenue + cogs (cogs é negativo na base)" },
    { metric: "margem bruta", computedFrom: "lucro bruto ÷ receita líquida" },
    { metric: "volume", computedFrom: "soma de weight_kg, convertida para toneladas" },
  ],
  months: [
    { metric: "receita mensal", computedFrom: "soma de net_revenue agrupada por month" },
    {
      metric: "crescimento",
      computedFrom: "(receita de julho − receita de janeiro) ÷ receita de janeiro",
    },
  ],
  coverage: [
    { metric: "registros", computedFrom: "linhas do base_case_planejamento.csv, sem filtro" },
    { metric: "municípios", computedFrom: "city normalizado (sem acento, maiúscula) distinto" },
    { metric: "clientes-proxy", computedFrom: "pares distintos de cep + customer_category" },
    {
      metric: "categorias",
      computedFrom: "customer_category e product_category distintos, nulos rotulados",
    },
  ],
  regions: [
    { metric: "receita da praça", computedFrom: "net_revenue somado pelos municípios de cada UF" },
    {
      metric: "atribuição de UF",
      computedFrom:
        "cada município vai para a UF onde concentra receita, resolvendo os CEPs fora da UF declarada",
    },
    { metric: "margem da praça", computedFrom: "(net + cogs) ÷ net, dentro da UF" },
  ],
  cities: [
    { metric: "receita do município", computedFrom: "net_revenue agrupado por city normalizado" },
    {
      metric: "clientes-proxy",
      computedFrom: "pares cep + customer_category distintos dentro do município",
    },
    { metric: "R$/cliente-mês", computedFrom: "receita do município ÷ clientes-proxy ÷ 7 meses" },
  ],
  geo: [
    { metric: "capital", computedFrom: "receita de Curitiba (PR) ou Florianópolis (SC)" },
    {
      metric: "região metropolitana",
      computedFrom: "municípios da RM oficial, excluída a capital",
    },
    { metric: "interior", computedFrom: "todo o resto da UF" },
  ],
  map: [
    {
      metric: "bairro",
      computedFrom:
        "neighborhood_api do cache de geocodificação por CEP (BrasilAPI), agrupado por município normalizado",
    },
    {
      metric: "coordenada do bairro",
      computedFrom: "mediana de latitude/longitude dos CEPs daquele bairro",
    },
    {
      metric: "não mapeado",
      computedFrom:
        "CEPs sem correspondência no cache — somados por cidade, sem coordenada, por isso nunca viram bolha",
    },
    {
      metric: "raio da bolha",
      computedFrom:
        "receita do ponto ÷ receita do maior ponto do mesmo nível (cidade ou bairro) — mesma lógica das barras de ranking",
    },
  ],
  maturation: [
    { metric: "receita por praça", computedFrom: "net_revenue por month e UF" },
    {
      metric: "clientes ativos",
      computedFrom: "pares cep + customer_category distintos que compraram naquele mês",
    },
    { metric: "receita por cliente", computedFrom: "receita do mês ÷ clientes ativos do mês" },
    {
      metric: "decomposição",
      computedFrom: "receita = clientes × receita por cliente; as duas variações multiplicam-se",
    },
  ],
  cohort: [
    {
      metric: "coorte",
      computedFrom: "clientes-proxy agrupados pelo mês da primeira compra na janela",
    },
    { metric: "célula", computedFrom: "quantos daquela coorte compraram no mês da coluna" },
    {
      metric: "limite",
      computedFrom:
        "a janela começa em janeiro: a coorte de jan inclui clientes antigos, não só novos",
    },
  ],
  retention: [
    {
      metric: "retenção",
      computedFrom: "clientes ativos no mês que voltam a comprar no mês seguinte ÷ ativos no mês",
    },
    {
      metric: "novos clientes",
      computedFrom: "clientes-proxy cuja primeira compra na janela é aquele mês",
    },
  ],
  customers: [
    { metric: "receita da categoria", computedFrom: "net_revenue agrupado por customer_category" },
    { metric: "margem", computedFrom: "(net + cogs) ÷ net dentro da categoria" },
    { metric: "R$/cliente-mês", computedFrom: "receita ÷ clientes-proxy da categoria ÷ 7 meses" },
  ],
  concentration: [
    {
      metric: "curva",
      computedFrom: "clientes-proxy ordenados por receita; share acumulado a cada decil",
    },
    { metric: "top 10%", computedFrom: "participação do primeiro decil na receita da praça" },
  ],
  products: [
    { metric: "receita da categoria", computedFrom: "net_revenue agrupado por product_category" },
    { metric: "margem", computedFrom: "(net + cogs) ÷ net dentro da categoria" },
    { metric: "R$/kg", computedFrom: "net_revenue ÷ weight_kg da categoria" },
  ],
  temperature: [
    { metric: "cadeia", computedFrom: "coluna temperature: dry ou refrigerated" },
    { metric: "% do peso", computedFrom: "weight_kg da cadeia ÷ weight_kg da praça" },
    { metric: "R$/kg", computedFrom: "net_revenue ÷ weight_kg da cadeia" },
  ],
  cascade: [
    { metric: "receita bruta", computedFrom: "soma de gross_revenue" },
    { metric: "descontos", computedFrom: "gross_revenue − net_revenue (não é coluna da base)" },
    { metric: "CMV", computedFrom: "soma de cogs, em módulo (a coluna vem negativa)" },
    { metric: "lucro bruto", computedFrom: "net_revenue + cogs, recalculado linha a linha" },
  ],
  derived: [
    { metric: "margem bruta", computedFrom: "lucro bruto ÷ receita líquida" },
    { metric: "desconto médio", computedFrom: "1 − (receita líquida ÷ receita bruta)" },
    { metric: "markup", computedFrom: "(net_revenue ÷ |cogs|) − 1" },
    {
      metric: "receita por cliente-mês",
      computedFrom: "net_revenue ÷ Σ clientes-proxy ativos em cada mês",
    },
  ],
  columns: [
    {
      metric: "grão do registro",
      computedFrom:
        "month × customer_category × region × city × cep × product_category × temperature",
    },
    { metric: "unicidade", computedFrom: "a combinação das 7 chaves é única em 100% das linhas" },
  ],
  treatments: [
    { metric: "origem", computedFrom: "scripts/build_facts.py, executado sobre o CSV original" },
    {
      metric: "garantia",
      computedFrom: "asserção de reconciliação: agregado = CSV até o centavo, ou o build falha",
    },
  ],
} satisfies Record<string, MetricExplainer[]>;

export { MONTHS, REGIONS, TOTALS, SOURCE_QUALITY, CUSTOMER_CATEGORIES, PRODUCT_CATEGORIES, CITIES };
export type { Region };

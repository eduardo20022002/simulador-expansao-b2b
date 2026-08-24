#!/usr/bin/env python3
"""
Gera src/lib/novara/facts.ts a partir da base interna de vendas (sintetica,
projeto de portfolio).

Fonte:  base_case_planejamento.csv  (vendas agregadas por mes, jan-jul/2026)
        base_case_planejamento_geo.csv (mesma base + latitude/longitude por cidade)

Este script é a ÚNICA ponte entre o CSV bruto e o dashboard. Nenhum número é
digitado à mão no app: tudo abaixo é derivado aqui e conferido por asserção.

Uso:
    python3 scripts/build_facts.py --base "/caminho/para/base-sintetica"
"""
import argparse, json, unicodedata
from pathlib import Path
import pandas as pd
import numpy as np

# --- Regiões metropolitanas (IBGE / leis estaduais) — usado só para o corte
# "capital / RM / interior". Fonte anotada no dashboard.
RM = {
    "PR": ["CURITIBA", "SAO JOSE DOS PINHAIS", "COLOMBO", "PONTA GROSSA"],
    "SC": ["FLORIANOPOLIS", "SAO JOSE", "BALNEARIO CAMBORIU"],
}
CAPITAL = {"PR": "CURITIBA", "SC": "FLORIANOPOLIS"}


def norm(s):
    if pd.isna(s):
        return None
    return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().upper().strip()


def load(base: Path):
    df = pd.read_csv(base / "base_case_planejamento.csv")
    df["city_n"] = df.city.map(norm)
    # A chave de agrupamento é sem acento (EUSEBIO == EUSÉBIO), mas o rótulo que
    # aparece na tela é a grafia mais frequente no arquivo, com acento.
    df["city_label"] = df.city_n.map(
        df.city.str.strip().groupby(df.city_n).agg(lambda g: g.value_counts().idxmax())
    )
    # 2 linhas têm customer_category nula — rotuladas, nunca descartadas.
    # A base grafa a mesma categoria com caixas diferentes ("Dono(a) de Casa" e
    # "Dono(a) de casa"): agrupamos sem caixa e adotamos a grafia mais frequente,
    # em vez de forçar Title Case (que estragaria "À la carte Brasileiro").
    raw = df.customer_category.fillna("Não informado").str.strip()
    canon = (
        raw.groupby(raw.str.lower()).agg(lambda g: g.value_counts().idxmax())
    )
    df["cust"] = raw.str.lower().map(canon)
    df["prod"] = df.product_category.fillna("Não informado")
    # gross_profit da base tem nulos; a identidade exata é net + cogs (cogs é negativo)
    # a coluna gross_profit existe e não tem nulos, mas 6,9% das linhas divergem
    # 1 centavo de net+cogs por arredondamento — usamos a identidade exata
    df["gp"] = df.net_revenue + df.cogs
    # cliente-proxy: não existe ID de cliente na base. CEP sozinho não serve
    # (28% dos CEPs têm mais de uma categoria de cliente).
    df["client"] = df.cep.astype(str) + "|" + df.cust
    df["mi"] = pd.to_datetime(df.month).dt.month - 1  # 0..6 = jan..jul
    return df


def city_coords(base: Path):
    """Centroide por cidade a partir da base geocodificada (BrasilAPI, por CEP)."""
    p = base / "base_case_planejamento_geo.csv"
    if not p.exists():
        return {}
    g = pd.read_csv(p, usecols=["city", "latitude", "longitude"])
    g["city_n"] = g.city.map(norm)
    c = g.groupby("city_n")[["latitude", "longitude"]].median()
    return {k: (round(v.latitude, 5), round(v.longitude, 5))
            for k, v in c.iterrows() if pd.notna(v.latitude)}


NEIGHBORHOOD_CACHE = "Segmentação da base original/cep_geocode_cache.csv"
UNMAPPED_LABEL = "Bairro não identificado"


def neighborhood_lookup(base: Path):
    """cep -> (bairro, lat, lon) a partir do cache de geocodificação (BrasilAPI)."""
    p = base / NEIGHBORHOOD_CACHE
    if not p.exists():
        return {}
    g = pd.read_csv(p, dtype={"cep": str})
    g = g[g.status == "ok"]
    out = {}
    for r in g.itertuples():
        nb = r.neighborhood_api
        if pd.isna(nb) or not str(nb).strip():
            continue
        out[r.cep] = (str(nb).strip(), r.latitude, r.longitude)
    return out


def neighborhood_dim(df: pd.DataFrame, lookup: dict, ci: dict, r2):
    """Dimensão bairro (grão: cidade × bairro, sem corte de mês/categoria) e o
    fato alinhado por posição. Todo CEP sem match no cache vira a linha
    sintética UNMAPPED_LABEL daquela cidade — nunca descartado, nunca
    plotável (lat/lon = None), para o app não fabricar uma coordenada falsa."""
    d = df.copy()
    d["cep_s"] = d.cep.astype(str)
    resolved = d.cep_s.map(lookup)  # NaN (float) do pandas quando o CEP não está no cache
    is_tuple = resolved.map(lambda t: isinstance(t, tuple))
    d["bairro"] = resolved.where(is_tuple).map(lambda t: t[0], na_action="ignore")
    d["bairro"] = d.bairro.fillna(UNMAPPED_LABEL)
    d["nb_lat"] = resolved.where(is_tuple).map(lambda t: t[1], na_action="ignore")
    d["nb_lon"] = resolved.where(is_tuple).map(lambda t: t[2], na_action="ignore")

    grp = d.groupby(["city_n", "bairro"]).agg(
        kg=("weight_kg", "sum"), gross=("gross_revenue", "sum"),
        net=("net_revenue", "sum"), cogs=("cogs", "sum"),
        lat=("nb_lat", "median"), lon=("nb_lon", "median"),
    ).reset_index()
    clients = d.groupby(["city_n", "bairro"]).client.nunique().reset_index(name="n")

    NEIGHBORHOODS, FACT_NB, CLIENTS_NB = [], [], []
    for i, (r, cl) in enumerate(zip(grp.itertuples(), clients.itertuples())):
        mapped = r.bairro != UNMAPPED_LABEL
        NEIGHBORHOODS.append({
            "city": ci[r.city_n], "name": r.bairro,
            "lat": None if not mapped or pd.isna(r.lat) else round(r.lat, 5),
            "lon": None if not mapped or pd.isna(r.lon) else round(r.lon, 5),
            "mapped": mapped,
        })
        FACT_NB.append([r2(r.net), r2(r.gross), r2(r.cogs), r2(r.kg)])
        CLIENTS_NB.append([i, int(cl.n)])
    return NEIGHBORHOODS, FACT_NB, CLIENTS_NB, grp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--out", default="src/lib/novara/facts.ts")
    a = ap.parse_args()
    base = Path(a.base)
    df = load(base)
    coords = city_coords(base)
    nb_lookup = neighborhood_lookup(base)

    MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]
    REGIONS = ["PR", "SC"]
    TEMPS = ["dry", "refrigerated"]

    # ---- dimensões (ordenadas por receita, para o app poder cortar top-N direto)
    city_rev = df.groupby(["city_n", "region"]).net_revenue.sum().reset_index()
    city_rev = city_rev.sort_values("net_revenue", ascending=False)
    # uma cidade pertence à região onde tem mais receita (resolve os ~89 registros
    # com CEP fora da UF declarada, ex.: SALVADOR marcada como CE)
    city_region = city_rev.drop_duplicates("city_n").set_index("city_n").region.to_dict()
    CITIES = list(city_rev.drop_duplicates("city_n").city_n)
    CUSTS = list(df.groupby("cust").net_revenue.sum().sort_values(ascending=False).index)
    PRODS = list(df.groupby("prod").net_revenue.sum().sort_values(ascending=False).index)

    ci = {c: i for i, c in enumerate(CITIES)}
    ui = {c: i for i, c in enumerate(CUSTS)}
    pi = {c: i for i, c in enumerate(PRODS)}
    ri = {c: i for i, c in enumerate(REGIONS)}
    ti = {c: i for i, c in enumerate(TEMPS)}

    r2 = lambda x: round(float(x), 2)

    # ---- FATO GEO: mês × cidade × categoria de cliente × temperatura
    fg = df.groupby(["mi", "city_n", "cust", "temperature"]).agg(
        kg=("weight_kg", "sum"), gross=("gross_revenue", "sum"),
        net=("net_revenue", "sum"), cogs=("cogs", "sum"), lines=("net_revenue", "size"),
    ).reset_index()
    FACT_GEO = [[int(r.mi), ci[r.city_n], ui[r.cust], ti[r.temperature],
                 r2(r.kg), r2(r.gross), r2(r.net), r2(r.cogs), int(r.lines)]
                for r in fg.itertuples()]

    # ---- FATO PRODUTO: mês × região × categoria de produto × temperatura
    fp = df.groupby(["mi", "region", "prod", "temperature"]).agg(
        kg=("weight_kg", "sum"), gross=("gross_revenue", "sum"),
        net=("net_revenue", "sum"), cogs=("cogs", "sum"),
    ).reset_index()
    FACT_PROD = [[int(r.mi), ri[r.region], pi[r.prod], ti[r.temperature],
                  r2(r.kg), r2(r.gross), r2(r.net), r2(r.cogs)]
                 for r in fp.itertuples()]

    # ---- Contagens de cliente-proxy (NÃO são somáveis: distinct count por corte)
    def distinct(keys):
        return df.groupby(keys).client.nunique().reset_index(name="n")

    CLIENTS = {
        "byMonthRegion": [[int(r.mi), ri[r.region], int(r.n)] for r in distinct(["mi", "region"]).itertuples()],
        "byMonthCity": [[int(r.mi), ci[r.city_n], int(r.n)] for r in distinct(["mi", "city_n"]).itertuples()],
        "byMonthRegionCust": [[int(r.mi), ri[r.region], ui[r.cust], int(r.n)]
                              for r in distinct(["mi", "region", "cust"]).itertuples()],
        "byCity": [[ci[r.city_n], int(r.n)] for r in distinct(["city_n"]).itertuples()],
        "byRegionCust": [[ri[r.region], ui[r.cust], int(r.n)] for r in distinct(["region", "cust"]).itertuples()],
    }

    # ---- Coorte de aquisição e retenção (proxy)
    first = df.groupby(["region", "client"]).mi.min().rename("m0").reset_index()
    act = df.groupby(["region", "client", "mi"]).net_revenue.sum().reset_index().merge(
        first, on=["region", "client"])
    COHORT, RETENTION, NEWCLI = {}, {}, {}
    for reg in REGIONS:
        s = act[act.region == reg]
        piv = s.pivot_table(index="m0", columns="mi", values="client", aggfunc="nunique")
        COHORT[reg] = [[int(m0), int(mi), int(v)] for m0 in piv.index for mi, v in piv.loc[m0].items()
                       if pd.notna(v)]
        RETENTION[reg] = []
        for m in range(6):
            aset = set(s[s.mi == m].client); bset = set(s[s.mi == m + 1].client)
            RETENTION[reg].append([m, len(aset), len(aset & bset)])
        nw = s[s.mi == s.m0].groupby("mi").agg(n=("client", "nunique"), net=("net_revenue", "sum"))
        NEWCLI[reg] = [[int(m), int(r.n), r2(r.net)] for m, r in nw.iterrows()]

    # ---- Distribuição de clientes (Pareto) — decis de receita por região
    PARETO = {}
    for reg in REGIONS:
        s = df[df.region == reg].groupby("client").net_revenue.sum().sort_values(ascending=False)
        tot = s.sum(); n = len(s)
        PARETO[reg] = {"clients": int(n), "deciles": [r2(100 * s.head(int(n * (d + 1) / 10)).sum() / tot)
                                                      for d in range(10)]}

    # ---- Dimensão cidade
    city_label = df.drop_duplicates("city_n").set_index("city_n").city_label.to_dict()
    CITY_DIM = []
    for c in CITIES:
        reg = city_region[c]
        lat, lon = coords.get(c, (None, None))
        CITY_DIM.append({"name": city_label.get(c, c), "region": reg, "lat": lat, "lon": lon,
                         "capital": c == CAPITAL[reg], "metro": c in RM[reg]})

    # ---- Bairro: cidade × bairro, a partir do cache de geocodificação por CEP
    NEIGHBORHOODS, FACT_NEIGHBORHOOD, CLIENTS_BY_NEIGHBORHOOD, nb_grp = neighborhood_dim(df, nb_lookup, ci, r2)

    # ---- Qualidade / procedência do dado (o que a base NÃO diz)
    nb_mapped_net = nb_grp.loc[nb_grp.bairro != UNMAPPED_LABEL, "net"].sum()
    QUALITY = {
        "sourceFile": "base_case_planejamento.csv",
        "rawRows": int(len(df)),
        "window": [MONTHS[0], MONTHS[-1]],
        "cityLabelsRaw": int(df.city.nunique()),
        "cityLabelsNormalised": int(df.city_n.nunique()),
        "ceps": int(df.cep.nunique()),
        "clientProxies": int(df.client.nunique()),
        "negativeLines": int((df.net_revenue < 0).sum()),
        "negativeNet": r2(df.loc[df.net_revenue < 0, "net_revenue"].sum()),
        "nullProduct": int(df.product_category.isna().sum()),
        # gross_profit NÃO tem nulos; diverge de net+cogs por arredondamento de centavo
        "grossProfitNulls": int(df.gross_profit.isna().sum()),
        "grossProfitRounded": int(((df.net_revenue + df.cogs - df.gross_profit).abs() > 0.001).sum()),
        "neighborhoodBairros": int((nb_grp.bairro != UNMAPPED_LABEL).sum()),
        "neighborhoodMappedNet": r2(nb_mapped_net),
        "neighborhoodUnmappedNet": r2(df.net_revenue.sum() - nb_mapped_net),
        "neighborhoodCoverage": r2(100 * nb_mapped_net / df.net_revenue.sum()),
    }

    # ---- Asserções de reconciliação: o app só pode mostrar o que fecha com o CSV
    assert abs(sum(r[6] for r in FACT_GEO) - df.net_revenue.sum()) < 0.01, "FACT_GEO não fecha o líquido"
    assert abs(sum(r[6] for r in FACT_PROD) - df.net_revenue.sum()) < 0.01, "FACT_PROD não fecha o líquido"
    assert abs(sum(r[4] for r in FACT_GEO) - df.weight_kg.sum()) < 0.01, "FACT_GEO não fecha o peso"
    assert abs(sum(r[0] for r in FACT_NEIGHBORHOOD) - df.net_revenue.sum()) < 0.01, \
        "FACT_NEIGHBORHOOD não fecha o líquido total"
    # cada cidade deve fechar com o mesmo total que FACT_GEO já reconcilia
    nb_by_city = {}
    for nb, row in zip(NEIGHBORHOODS, FACT_NEIGHBORHOOD):
        nb_by_city[nb["city"]] = nb_by_city.get(nb["city"], 0.0) + row[0]
    fg_by_city = {}
    for r in FACT_GEO:
        fg_by_city[r[1]] = fg_by_city.get(r[1], 0.0) + r[6]
    for c, nb_net in nb_by_city.items():
        assert abs(nb_net - fg_by_city.get(c, 0.0)) < 0.01, \
            f"bairros da cidade índice {c} não fecham com FACT_GEO"

    TOTALS = {"gross": r2(df.gross_revenue.sum()), "net": r2(df.net_revenue.sum()),
              "cogs": r2(df.cogs.sum()), "gp": r2(df.gp.sum()), "kg": r2(df.weight_kg.sum())}

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    j = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    with out.open("w", encoding="utf-8") as f:
        f.write(f"""/* ============================================================================
 * GERADO POR scripts/build_facts.py — NÃO EDITE À MÃO.
 * Fonte: base_case_planejamento.csv ({QUALITY['rawRows']:,} linhas, jan–jul/2026)
 * Regerar:  python3 scripts/build_facts.py --base "<pasta do case>"
 *
 * Convenções da base, preservadas aqui:
 *   - cogs é NEGATIVO; lucro bruto = net + cogs (recalculado, não a coluna).
 *   - "cliente" é PROXY (cep + categoria de cliente). Não existe ID de cliente
 *     na base. Contagem de cliente NÃO é somável entre linhas do fato — use as
 *     tabelas CLIENTS_*, que trazem o distinct count já calculado por corte.
 *   - Cidades normalizadas sem acento/caixa ({QUALITY['cityLabelsRaw']} rótulos brutos
 *     → {QUALITY['cityLabelsNormalised']} cidades).
 * ==========================================================================*/

export const MONTHS = {j(MONTHS)} as const;
export const REGIONS = {j(REGIONS)} as const;
export const TEMPERATURES = {j(TEMPS)} as const;
export type Region = (typeof REGIONS)[number];
export type Temperature = (typeof TEMPERATURES)[number];

export interface CityDim {{
  name: string;
  region: Region;
  lat: number | null;
  lon: number | null;
  capital: boolean;
  metro: boolean;
}}
export const CITIES: CityDim[] = {j(CITY_DIM)};
export const CUSTOMER_CATEGORIES = {j(CUSTS)};
export const PRODUCT_CATEGORIES = {j(PRODS)};

export interface NeighborhoodDim {{
  city: number;
  name: string;
  lat: number | null;
  lon: number | null;
  mapped: boolean;
}}
/** Grão: cidade × bairro, sem corte de mês/categoria — só o que o mapa precisa. */
export const NEIGHBORHOODS: NeighborhoodDim[] = {j(NEIGHBORHOODS)};
/** [líquido, bruto, cmv, kg] — alinhado por POSIÇÃO com NEIGHBORHOODS (1:1 por
 * construção, sem corte de mês; diferente de FACT_GEO, que carrega chave
 * explícita por ter múltiplos cortes). */
export type NeighborhoodRow = [number, number, number, number];
export const FACT_NEIGHBORHOOD: NeighborhoodRow[] = {j(FACT_NEIGHBORHOOD)};
/** [índice em NEIGHBORHOODS, clientes-proxy distintos] */
export const CLIENTS_BY_NEIGHBORHOOD: [number, number][] = {j(CLIENTS_BY_NEIGHBORHOOD)};

/** [mês, cidade, categoriaCliente, temperatura, kg, bruto, líquido, cmv, linhas] */
export type GeoRow = [number, number, number, number, number, number, number, number, number];
export const FACT_GEO: GeoRow[] = {j(FACT_GEO)};

/** [mês, região, categoriaProduto, temperatura, kg, bruto, líquido, cmv] */
export type ProdRow = [number, number, number, number, number, number, number, number];
export const FACT_PROD: ProdRow[] = {j(FACT_PROD)};

/** Clientes-proxy distintos, pré-calculados por corte (contagem não é somável). */
export const CLIENTS_BY_MONTH_REGION: [number, number, number][] = {j(CLIENTS['byMonthRegion'])};
export const CLIENTS_BY_MONTH_CITY: [number, number, number][] = {j(CLIENTS['byMonthCity'])};
export const CLIENTS_BY_MONTH_REGION_CUST: [number, number, number, number][] = {j(CLIENTS['byMonthRegionCust'])};
export const CLIENTS_BY_CITY: [number, number][] = {j(CLIENTS['byCity'])};
export const CLIENTS_BY_REGION_CUST: [number, number, number][] = {j(CLIENTS['byRegionCust'])};

/** [mês da 1ª compra, mês observado, clientes-proxy ativos] */
export const COHORT: Record<Region, [number, number, number][]> = {j(COHORT)};
/** [mês, ativos no mês, quantos voltam no mês seguinte] */
export const RETENTION: Record<Region, [number, number, number][]> = {j(RETENTION)};
/** [mês, novos clientes-proxy, receita líquida desses novos] */
export const NEW_CLIENTS: Record<Region, [number, number, number][]> = {j(NEWCLI)};
/** Share acumulado da receita pelos decis de cliente (do maior para o menor). */
export const PARETO: Record<Region, {{ clients: number; deciles: number[] }}> = {j(PARETO)};

/** Totais da janela, direto do CSV — âncora de reconciliação do engine. */
export const TOTALS = {j(TOTALS)};
/** Procedência e limites conhecidos do dado bruto. */
export const SOURCE_QUALITY = {j(QUALITY)};
""")
    print(f"escrito {out}  ({out.stat().st_size/1024:.0f} KB)")
    print(f"FACT_GEO {len(FACT_GEO)} linhas | FACT_PROD {len(FACT_PROD)} | cidades {len(CITIES)}")
    print("reconciliação ok: líquido e peso fecham com o CSV")


if __name__ == "__main__":
    main()

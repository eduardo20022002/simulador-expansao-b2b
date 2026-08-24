#!/usr/bin/env python3
"""
Gera os CSVs de importação do Postgres a partir da base bruta.

Não commita nada: escreve em --out (fora do repositório por padrão), porque o
CSV de vendas tem ~40 MB e não deve entrar no git.

Uso:
    python3 scripts/export_for_supabase.py --base "<pasta do case>" --out /tmp/supabase
"""
import argparse
import unicodedata
from pathlib import Path

import pandas as pd

CACHE = "Segmentação da base original/cep_geocode_cache.csv"


def norm(s):
    if pd.isna(s):
        return None
    return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().upper().strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    base, out = Path(a.base), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    # ---- fato venda
    df = pd.read_csv(base / "base_case_planejamento.csv", dtype={"cep": str})
    df["city_norm"] = df.city.map(norm)
    df["cep"] = df.cep.str.zfill(8)
    cols = ["month", "customer_category", "region", "city", "city_norm", "cep",
            "product_category", "temperature", "weight_kg", "gross_revenue",
            "net_revenue", "cogs", "gross_profit"]
    sales = out / "sales.csv"
    df[cols].to_csv(sales, index=False)

    # ---- dimensão CEP
    g = pd.read_csv(base / CACHE, dtype={"cep": str})
    g["cep"] = g.cep.str.zfill(8)
    g = g.rename(columns={"neighborhood_api": "neighborhood"})
    g = g.drop_duplicates("cep")
    geo = out / "cep_geo.csv"
    g[["cep", "latitude", "longitude", "city_api", "state_api", "neighborhood", "status"]].to_csv(
        geo, index=False
    )

    # ---- âncoras de conferência, para validar a carga do outro lado
    print(f"sales.csv    {len(df):>7} linhas  ({sales.stat().st_size/1e6:.1f} MB)")
    print(f"cep_geo.csv  {len(g):>7} linhas  ({geo.stat().st_size/1e6:.1f} MB)")
    print()
    print("Confira depois da importação — estes números têm de bater:")
    print(f"  select count(*) from sales;                    -> {len(df)}")
    print(f"  select sum(net_revenue) from sales;            -> {df.net_revenue.sum():.2f}")
    print(f"  select sum(net_revenue + cogs) from sales;     -> {(df.net_revenue + df.cogs).sum():.2f}")
    print(f"  select count(distinct city_norm) from sales;   -> {df.city_norm.nunique()}")
    print(f"  select count(*) from cep_geo;                  -> {len(g)}")


if __name__ == "__main__":
    main()

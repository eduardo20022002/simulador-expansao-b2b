#!/usr/bin/env python3
"""Gera uma base de vendas sintetica com o mesmo schema da base real, para
alimentar scripts/build_facts.py e produzir um facts.ts sem nenhum dado real.

Uso:
    python3 scripts/gerar_base_sintetica.py --out /tmp/base_sintetica
"""
import argparse
import random
from pathlib import Path

import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]

# Duas pracas ficticias, com peso relativo de receita diferente (a sede pesa mais).
CITIES = {
    "PR": [
        ("CURITIBA", 1.00, True), ("LONDRINA", 0.22, False), ("MARINGA", 0.18, False),
        ("PONTA GROSSA", 0.11, False), ("CASCAVEL", 0.09, False), ("SAO JOSE DOS PINHAIS", 0.14, False),
        ("COLOMBO", 0.07, False), ("FOZ DO IGUACU", 0.06, False),
    ],
    "SC": [
        ("FLORIANOPOLIS", 0.85, True), ("JOINVILLE", 0.30, False), ("BLUMENAU", 0.20, False),
        ("CHAPECO", 0.13, False), ("ITAJAI", 0.12, False), ("SAO JOSE", 0.10, False),
        ("CRICIUMA", 0.08, False), ("BALNEARIO CAMBORIU", 0.09, False),
    ],
}

CUSTOMER_CATEGORIES = [
    "Restaurante A La Carte", "Pizzaria", "Padaria", "Lanchonete e Salgados",
    "Bar e Petiscos", "Hotel e Pousada", "Churrascaria", "Hamburgueria",
    "Cafeteria", "Self-service e Quilo", "Marmitaria", "Acai e Sorvetes",
    "Cozinha Industrial", "Mercearia e Conveniencia", "Confeitaria e Doces",
    "Buffet e Eventos", "Escola e Creche", "Clube e Associacao",
]

PRODUCT_CATEGORIES = [
    "Mussarela e Coalho", "Carnes Nobres", "Suinos Processados", "Margarina",
    "Leite Condensado", "Aves", "Gordura Vegetal", "Derivados de Leite",
    "Creme de Leite", "Queijos Finos", "Cafe", "Oleo de Soja",
    "Farinha de Trigo", "Agua Mineral", "Refrigerante", "Massas Secas",
    "Molhos e Temperos", "Embutidos", "Peixes e Frutos do Mar", "Hortifruti Processado",
    "Descartaveis", "Produtos de Limpeza", "Sobremesas Prontas", "Paes Congelados",
]

TEMPERATURES = ["dry", "refrigerated"]

CEP_PREFIX = {"PR": "8", "SC": "8"}  # ambos ficticiamente na faixa 8xxxx-xxx


def gerar_cep(uf: str, city_idx: int) -> str:
    base = 80000000 if uf == "PR" else 88000000
    return f"{base + city_idx * 1000 + random.randint(0, 999):08d}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--linhas", type=int, default=9000)
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    rows = []
    for uf, cities in CITIES.items():
        for month in MONTHS:
            sazonal = 1.0 + 0.08 * np.sin(MONTHS.index(month))
            for city_name, peso_cidade, _capital in cities:
                n_linhas_cidade = max(3, int(a.linhas / (len(MONTHS) * sum(len(v) for v in CITIES.values())) * peso_cidade * sazonal))
                city_idx = [c[0] for c in cities].index(city_name)
                for _ in range(n_linhas_cidade):
                    cust = random.choice(CUSTOMER_CATEGORIES)
                    prod = random.choice(PRODUCT_CATEGORIES)
                    temp = random.choices(TEMPERATURES, weights=[0.62, 0.38])[0]
                    weight_kg = round(np.random.lognormal(mean=3.2, sigma=1.1), 3)
                    preco_kg = round(np.random.uniform(6.5, 28.0), 2)
                    gross = round(weight_kg * preco_kg, 2)
                    desconto_pct = np.random.uniform(0.06, 0.16)
                    net = round(gross * (1 - desconto_pct), 2)
                    cmv_pct = np.random.uniform(0.80, 0.90)
                    cogs = round(-net * cmv_pct, 2)
                    gross_profit = round(net + cogs, 2)
                    rows.append({
                        "month": f"{month}-01",
                        "customer_category": cust,
                        "region": uf,
                        "city": city_name,
                        "cep": gerar_cep(uf, city_idx),
                        "product_category": prod,
                        "temperature": temp,
                        "weight_kg": weight_kg,
                        "gross_revenue": gross,
                        "net_revenue": net,
                        "cogs": cogs,
                        "gross_profit": gross_profit,
                    })

    df = pd.DataFrame(rows)
    sales_path = out / "base_case_planejamento.csv"
    df.to_csv(sales_path, index=False)

    # Coordenadas aproximadas (publicas) das cidades ficticias escolhidas
    COORDS = {
        "CURITIBA": (-25.4284, -49.2733), "LONDRINA": (-23.3103, -51.1628),
        "MARINGA": (-23.4210, -51.9331), "PONTA GROSSA": (-25.0950, -50.1619),
        "CASCAVEL": (-24.9558, -53.4552), "SAO JOSE DOS PINHAIS": (-25.5300, -49.2064),
        "COLOMBO": (-25.2917, -49.2242), "FOZ DO IGUACU": (-25.5478, -54.5882),
        "FLORIANOPOLIS": (-27.5954, -48.5480), "JOINVILLE": (-26.3044, -48.8461),
        "BLUMENAU": (-26.9194, -49.0661), "CHAPECO": (-27.1000, -52.6152),
        "ITAJAI": (-26.9078, -48.6614), "SAO JOSE": (-27.5969, -48.6394),
        "CRICIUMA": (-28.6775, -49.3697), "BALNEARIO CAMBORIU": (-26.9906, -48.6350),
    }
    geo_rows = [{"city": k, "latitude": v[0], "longitude": v[1]} for k, v in COORDS.items()]
    pd.DataFrame(geo_rows).to_csv(out / "base_case_planejamento_geo.csv", index=False)

    print(f"{len(df)} linhas sinteticas escritas em {sales_path}")
    print(f"receita liquida total: R$ {df.net_revenue.sum():,.2f}")
    print(f"cidades: {df.city.nunique()}  |  categorias cliente: {df.customer_category.nunique()}  |  categorias produto: {df.product_category.nunique()}")


if __name__ == "__main__":
    main()

import { createFileRoute } from "@tanstack/react-router";

import { AnchorFigure } from "@/components/novara/AnchorFigure";
import { BigFigures } from "@/components/novara/BigFigures";
import { Cascade } from "@/components/novara/Cascade";
import { DerivedGrid } from "@/components/novara/DerivedGrid";
import { MonthBars } from "@/components/novara/MonthBars";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import {
  DERIVED_CLOSING,
  EXPLAIN,
  MONTHS_REVENUE_LEGEND,
  bigFigures,
  cascade,
  derivedMetrics,
  monthsRevenue,
} from "@/lib/novara/engine";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · Base interna Novara" },
      {
        name: "description",
        content:
          "Do preço de tabela ao lucro bruto: receita bruta, descontos, CMV e margem da operação Novara em PE e CE.",
      },
      { property: "og:title", content: "Financeiro · Base interna Novara" },
      {
        property: "og:description",
        content: "A cascata de receita bruta até lucro bruto e as métricas que saem dela.",
      },
    ],
  }),
  component: Financeiro,
});

function Financeiro() {
  const figures = bigFigures();
  const derived = derivedMetrics();
  const profit = figures[3]!; // [receita bruta, receita líquida, CMV, lucro bruto]

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Financeiro"
        subtitle="As quatro colunas financeiras da base e tudo que sai delas sem nenhuma premissa externa. É a leitura mais dura do dado: receita, custo da mercadoria e o que sobra."
      />

      <AnchorFigure
        value={profit.value}
        caption={`${profit.label} acumulado em jan–jul/2026`}
        scope={`${derived[0]!.value} de margem bruta sobre receita líquida de ${figures[1]!.value}. É o último resultado que a base permite ver — frete, CD e comercial não estão aqui.`}
      />

      <Section title="As quatro colunas" explain={EXPLAIN.cascade} emphasis="quiet">
        <BigFigures items={figures} />
      </Section>

      <Section
        title="Do preço de tabela ao lucro bruto"
        description="A largura de cada barra é a fração exata da receita bruta: o que foi abatido em desconto, o que o produto custou e o que sobrou."
        explain={EXPLAIN.cascade}
      >
        <Cascade steps={cascade()} />
      </Section>

      <Section
        title="Métricas derivadas"
        explain={EXPLAIN.derived}
        footer={DERIVED_CLOSING}
        emphasis="quiet"
      >
        <DerivedGrid items={derived} />
      </Section>

      <Section title="Receita mês a mês" explain={EXPLAIN.months}>
        <MonthBars
          title="receita líquida por mês · duas praças somadas"
          points={monthsRevenue()}
          unit="R$ milhões"
          explain={EXPLAIN.months}
          legend={MONTHS_REVENUE_LEGEND}
        />
      </Section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AnchorFigure } from "@/components/novara/AnchorFigure";
import { KpiRow } from "@/components/novara/KpiRow";
import { LineChart } from "@/components/novara/LineChart";
import { PageHeader } from "@/components/novara/PageHeader";
import { RankBars } from "@/components/novara/RankBars";
import { RegionCards } from "@/components/novara/RegionCards";
import { Section } from "@/components/novara/Section";
import { SplitBar } from "@/components/novara/SplitBar";
import {
  EXPLAIN,
  TICK,
  MONTHS_REVENUE_LEGEND,
  fmtPct,
  growthByRegion,
  headlineKpis,
  regionStats,
  revenueSeries,
  temperatureSplit,
  topCities,
  topCustomerCategories,
  topProducts,
} from "@/lib/novara/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão geral · Base interna Novara" },
      {
        name: "description",
        content:
          "Receita líquida, lucro bruto, margem e volume da operação Novara em Paraná e Santa Catarina entre janeiro e julho de 2026.",
      },
      { property: "og:title", content: "Visão geral · Base interna Novara" },
      {
        property: "og:description",
        content: "O retrato de sete meses das duas operações da Novara, praça a praça.",
      },
    ],
  }),
  component: Overview,
});

function Overview() {
  const regions = regionStats();
  const kpis = headlineKpis();
  const net = kpis[0]!; // receita líquida

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Visão geral"
        subtitle="Sete meses das duas operações que a Novara já tem. Quanto entrou, quanto sobrou, e o quanto cada praça se parece com a outra — que é a régua para projetar uma terceira."
      />

      <AnchorFigure
        value={net.value}
        caption={`receita líquida — ${net.caption}`}
        scope={`${net.trend!}. ${kpis[2]!.value} de margem bruta e ${kpis[3]!.value} movimentadas no período.`}
      />

      <Section title="Indicadores do período" explain={EXPLAIN.kpis} emphasis="quiet">
        <KpiRow items={kpis} />
      </Section>

      <Section
        title="Duas praças em estágios diferentes"
        description={`Paraná cresce ${fmtPct(growthByRegion("PR"))} de janeiro a julho; Santa Catarina, ${fmtPct(growthByRegion("SC"))}. A praça menor cresce mais rápido e com margem menor — a assinatura de uma operação ainda comprando mercado.`}
        explain={EXPLAIN.regions}
      >
        <div className="flex flex-col gap-4">
          <LineChart
            title="receita líquida mensal por praça"
            hint="em R$ milhões"
            series={revenueSeries()}
            fmtTick={TICK.decimal1}
            unit="R$ milhões"
            explain={EXPLAIN.months}
            legend={MONTHS_REVENUE_LEGEND}
          />
          <RegionCards items={regions} />
        </div>
      </Section>

      <Section title="Onde o dinheiro está" explain={EXPLAIN.cities}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RankBars
            title="municípios por receita"
            hint="participação na receita líquida das duas praças"
            items={topCities(8)}
            explain={EXPLAIN.cities}
          />
          <SplitBar
            title="cadeia de temperatura"
            hint="o refrigerado é minoria em peso e quase metade da receita — e é ele que define o custo do CD"
            parts={temperatureSplit()}
            explain={EXPLAIN.temperature}
          />
        </div>
      </Section>

      <Section title="O que se vende e para quem" explain={EXPLAIN.products}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RankBars
            title="categorias de produto"
            hint="participação na receita líquida"
            items={topProducts(6)}
            explain={EXPLAIN.products}
          />
          <RankBars
            title="categorias de cliente"
            hint="participação na receita líquida"
            items={topCustomerCategories(6)}
            tone="accent"
            explain={EXPLAIN.customers}
          />
        </div>
      </Section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AnchorFigure } from "@/components/novara/AnchorFigure";
import { ChipList } from "@/components/novara/ChipList";
import { DataTable } from "@/components/novara/DataTable";
import { DerivedGrid } from "@/components/novara/DerivedGrid";
import { LineChart } from "@/components/novara/LineChart";
import { PageHeader } from "@/components/novara/PageHeader";
import { RankBars } from "@/components/novara/RankBars";
import { Section } from "@/components/novara/Section";
import {
  CUSTOMER_CATEGORIES,
  TICK,
  CUSTOMER_HEADERS,
  EXPLAIN,
  MIX_REGION_HEADERS,
  concentrationStats,
  customerMixByRegion,
  customerTable,
  paretoSeries,
  topCustomerCategories,
} from "@/lib/novara/engine";

export const Route = createFileRoute("/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira · Base interna Novara" },
      {
        name: "description",
        content:
          "Quem compra da Novara: categorias de estabelecimento por receita, margem e ticket, e o quanto a receita se concentra na ponta da carteira.",
      },
      { property: "og:title", content: "Carteira · Base interna Novara" },
      {
        property: "og:description",
        content: "O retrato da carteira: quem compra, quanto pesa e o quanto está concentrado.",
      },
    ],
  }),
  component: Carteira,
});

function Carteira() {
  const top = topCustomerCategories(1)[0]!;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Carteira"
        subtitle="Quem compra da Novara. Trinta e quatro tipos de estabelecimento, com pesos e margens muito diferentes — e uma diferença de perfil entre as duas praças que explica parte do gap de margem."
      />

      <AnchorFigure
        value={top.value}
        caption={`maior categoria de cliente: ${top.label}`}
        scope={`${top.share} da receita líquida total, entre ${CUSTOMER_CATEGORIES.length} categorias na carteira.`}
      />

      <Section title="Quem mais compra" explain={EXPLAIN.customers}>
        <RankBars
          title="categorias de cliente por receita"
          hint="participação na receita líquida total"
          items={topCustomerCategories(10)}
          tone="accent"
          explain={EXPLAIN.customers}
        />
      </Section>

      <Section
        title="Receita, margem e ticket por categoria"
        description="A categoria que mais fatura não é a que mais dá margem, nem a que tem o cliente maior."
        explain={EXPLAIN.customers}
        emphasis="quiet"
      >
        <DataTable headers={CUSTOMER_HEADERS} rows={customerTable(14)} bars quiet />
      </Section>

      <Section
        title="O perfil não é o mesmo nas duas praças"
        description="Participação de cada categoria dentro da própria praça. A diferença mostra que Santa Catarina vende mais para varejo alimentar de bairro e Paraná mais para alto ticket institucional."
        explain={EXPLAIN.customers}
        emphasis="quiet"
      >
        <DataTable headers={MIX_REGION_HEADERS} rows={customerMixByRegion(12)} quiet />
      </Section>

      <Section
        title="Concentração da carteira"
        description="Clientes-proxy ordenados por receita: quanto os maiores respondem do total de cada praça."
        explain={EXPLAIN.concentration}
      >
        <div className="flex flex-col gap-4">
          <LineChart
            title="curva de concentração"
            hint="share acumulado da receita a cada decil de cliente"
            series={paretoSeries()}
            fmtTick={TICK.pct}
            unit="% acumulado da receita da praça"
            explain={EXPLAIN.concentration}
            legend="A leitura: em Paraná os 10% maiores clientes fazem quase dois terços da receita da praça. O Santa Catarina é um pouco menos concentrado — carteira mais nova, ainda sem grandes contas consolidadas."
          />
          <DerivedGrid items={concentrationStats()} />
        </div>
      </Section>

      <Section
        title="Inventário de categorias de cliente"
        description="Todas as categorias registradas na base, ordenadas por receita."
        emphasis="quiet"
      >
        <ChipList title="quem compra" items={CUSTOMER_CATEGORIES} collapsedCount={14} />
      </Section>
    </div>
  );
}

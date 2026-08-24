import { createFileRoute } from "@tanstack/react-router";

import { AnchorFigure } from "@/components/novara/AnchorFigure";
import { CohortTable } from "@/components/novara/CohortTable";
import { DataTable } from "@/components/novara/DataTable";
import { LineChart } from "@/components/novara/LineChart";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import {
  EXPLAIN,
  TICK,
  GROWTH_HEADERS,
  WINDOW_GROWTH,
  fmtSigned,
  growthByRegion,
  MONTHS,
  NEW_CLIENTS_HEADERS,
  activeClientsSeries,
  cohortMatrix,
  growthDecomposition,
  monthLabel,
  newClientsTable,
  retentionSeries,
  revenueSeries,
  ticketSeries,
} from "@/lib/novara/engine";

export const Route = createFileRoute("/maturacao")({
  head: () => ({
    meta: [
      { title: "Maturação · Base interna Novara" },
      {
        name: "description",
        content:
          "Como cada praça da Novara amadurece: crescimento decomposto em base de clientes e ticket, coorte de aquisição e retenção mês a mês.",
      },
      { property: "og:title", content: "Maturação · Base interna Novara" },
      {
        property: "og:description",
        content: "A curva de rampa do Santa Catarina contra a curva madura de Paraná.",
      },
    ],
  }),
  component: Maturacao,
});

const monthLabels = MONTHS.map((_, i) => monthLabel(i));

function Maturacao() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Maturação"
        subtitle="A base guarda duas operações em estágios diferentes da mesma curva. Paraná já madura, Santa Catarina ainda em rampa — e é essa diferença que permite projetar como se comportaria uma praça nova."
      />

      <AnchorFigure
        value={fmtSigned(WINDOW_GROWTH)}
        caption="crescimento da receita líquida somada, de janeiro a julho"
        scope={`PR ${fmtSigned(growthByRegion("PR"))} · SC ${fmtSigned(growthByRegion("SC"))} — a praça menor cresce mais rápido e com margem menor.`}
      />

      <Section
        title="De onde vem o crescimento"
        description="Receita é clientes ativos vezes receita por cliente. Separar os dois diz se a praça está conquistando mercado novo ou aprofundando o que já tem."
        explain={EXPLAIN.maturation}
        footer="Nas duas praças o crescimento vem mais de carteira do que de aquisição — e no Santa Catarina isso é extremo: quase todo o salto é o mesmo cliente comprando mais."
      >
        <DataTable headers={GROWTH_HEADERS} rows={growthDecomposition()} />
      </Section>

      <Section title="Receita e clientes ativos" explain={EXPLAIN.maturation}>
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <LineChart
            title="receita líquida mensal"
            hint="em R$ milhões"
            series={revenueSeries()}
            fmtTick={TICK.decimal1}
            unit="R$ milhões"
            explain={EXPLAIN.maturation}
          />
          <LineChart
            title="clientes-proxy ativos no mês"
            hint="pares CEP + categoria que compraram no mês"
            series={activeClientsSeries()}
            fmtTick={TICK.int}
            unit="clientes-proxy"
            explain={EXPLAIN.maturation}
          />
        </div>
      </Section>

      <Section title="Ticket médio e retenção" explain={EXPLAIN.maturation} emphasis="quiet">
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <LineChart
            title="receita por cliente ativo"
            hint="em R$ por mês — a medida de share of wallet"
            series={ticketSeries()}
            fmtTick={TICK.reais}
            zeroBased={false}
            unit="R$ por cliente no mês"
            explain={EXPLAIN.maturation}
            legend="Em julho o cliente médio do Santa Catarina já compra mais que o de Paraná, apesar de a praça ser um terço do tamanho e ter margem menor."
          />
          <LineChart
            title="retenção mês a mês"
            hint="% dos ativos que voltam a comprar no mês seguinte"
            series={retentionSeries()}
            fmtTick={TICK.pct}
            zeroBased={false}
            unit="% dos ativos que voltam"
            explain={EXPLAIN.retention}
          />
        </div>
      </Section>

      <Section
        title="Coorte de aquisição"
        description="Dos clientes que compraram pela primeira vez em cada mês, quantos seguiram comprando depois. A intensidade da célula é a retenção da coorte."
        explain={EXPLAIN.cohort}
        footer="A coorte de janeiro carrega toda a base pré-existente, porque a janela começa nela: não é uma coorte de novos clientes, é o retrato do que já havia."
      >
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <CohortTable
            title="Paraná"
            hint="clientes-proxy por coorte"
            months={monthLabels}
            rows={cohortMatrix("PR")}
          />
          <CohortTable
            title="Santa Catarina"
            hint="clientes-proxy por coorte"
            months={monthLabels}
            rows={cohortMatrix("SC")}
          />
        </div>
      </Section>

      <Section
        title="Quanto pesa quem entrou agora"
        description="Clientes que fizeram a primeira compra no mês, e o quanto essa entrada representa da receita daquele mês."
        explain={EXPLAIN.retention}
      >
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <DataTable
            headers={NEW_CLIENTS_HEADERS}
            rows={newClientsTable("PR")}
            caption="Paraná"
          />
          <DataTable
            headers={NEW_CLIENTS_HEADERS}
            rows={newClientsTable("SC")}
            caption="Santa Catarina"
          />
        </div>
      </Section>
    </div>
  );
}

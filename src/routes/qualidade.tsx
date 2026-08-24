import { createFileRoute } from "@tanstack/react-router";

import { AnchorFigure } from "@/components/novara/AnchorFigure";
import { BlindSpots } from "@/components/novara/BlindSpots";
import { ColumnTable } from "@/components/novara/ColumnTable";
import { CoverageGrid } from "@/components/novara/CoverageGrid";
import { MonthBars } from "@/components/novara/MonthBars";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import { TreatmentList } from "@/components/novara/TreatmentList";
import {
  BLIND_SPOTS,
  COLUMNS,
  COLUMNS_HEADERS,
  EXPLAIN,
  GRAIN_NOTE,
  NEXT_STEP,
  PROVENANCE,
  baseSummary,
  coverage,
  monthsRecords,
  treatments,
} from "@/lib/novara/engine";

export const Route = createFileRoute("/qualidade")({
  head: () => ({
    meta: [
      { title: "Qualidade do dado · Base interna Novara" },
      {
        name: "description",
        content:
          "Cobertura, grão do registro, tratamentos aplicados e limites conhecidos da base de vendas da Novara.",
      },
      { property: "og:title", content: "Qualidade do dado · Base interna Novara" },
      {
        property: "og:description",
        content: "De onde vem cada número, o que foi tratado e o que a base não responde.",
      },
    ],
  }),
  component: Qualidade,
});

function Qualidade() {
  const rows = baseSummary()[0]!; // registros brutos

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Qualidade do dado"
        subtitle="A procedência de tudo que este dashboard mostra: o que a base cobre, como cada linha está organizada, o que foi tratado antes de somar e onde o dado cala."
      />

      <AnchorFigure
        value={rows.value}
        caption={`registros brutos — ${rows.caption}`}
        scope={PROVENANCE}
      />

      <Section title="Cobertura" explain={EXPLAIN.coverage}>
        <CoverageGrid items={coverage()} />
      </Section>

      <Section
        title="Do CSV até a tela"
        description="Nenhum número deste dashboard é digitado à mão: tudo vem de um agregado gerado por script, que falha se não fechar com o arquivo original."
        explain={EXPLAIN.treatments}
      >
        <CoverageGrid items={baseSummary()} />
      </Section>

      <Section title="Integridade da janela" explain={EXPLAIN.coverage}>
        <MonthBars
          title="registros brutos por mês"
          points={monthsRecords()}
          unit="linhas do CSV"
          explain={EXPLAIN.coverage}
          legend="A janela é contínua: nenhum mês falta e nenhum mês está pela metade."
        />
      </Section>

      <Section title="O grão do registro" explain={EXPLAIN.columns} footer={GRAIN_NOTE}>
        <ColumnTable columns={COLUMNS} headers={COLUMNS_HEADERS} />
      </Section>

      <Section
        title="Tratamentos aplicados"
        description="O que foi feito com o dado bruto antes de qualquer número aparecer na tela."
        explain={EXPLAIN.treatments}
      >
        <TreatmentList items={treatments()} />
      </Section>

      <Section
        title="O que a base não responde"
        description="Os limites são parte da leitura. Toda análise deste dashboard herda todos eles."
      >
        <BlindSpots items={BLIND_SPOTS} nextStep={NEXT_STEP} />
      </Section>
    </div>
  );
}

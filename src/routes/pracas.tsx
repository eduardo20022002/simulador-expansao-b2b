import { createFileRoute } from "@tanstack/react-router";

import { AnchorFigure } from "@/components/novara/AnchorFigure";
import { ChipList } from "@/components/novara/ChipList";
import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { RankBars } from "@/components/novara/RankBars";
import { RegionCards } from "@/components/novara/RegionCards";
import { Section } from "@/components/novara/Section";
import { SplitBar } from "@/components/novara/SplitBar";
import {
  CITY_TABLE_HEADERS,
  EXPLAIN,
  cityNames,
  cityTable,
  coverage,
  fmtPct,
  geoConcentration,
  interiorShare,
  regionStats,
  topCities,
} from "@/lib/novara/engine";

export const Route = createFileRoute("/pracas")({
  head: () => ({
    meta: [
      { title: "Praças · Base interna Novara" },
      {
        name: "description",
        content:
          "Paraná e Santa Catarina lado a lado: receita, margem, volume e os municípios que sustentam cada praça.",
      },
      { property: "og:title", content: "Praças · Base interna Novara" },
      {
        property: "og:description",
        content: "Comparativo das duas praças e o ranking dos municípios por receita.",
      },
    ],
  }),
  component: Pracas,
});

function Pracas() {
  const cities = coverage()[2]!; // [período, praças, municípios, ...]
  const regions = regionStats();
  const pe = regions[0]!;
  const ce = regions[1]!;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Praças"
        subtitle="Paraná e Santa Catarina lado a lado. A diferença entre as duas não é só tamanho: é o quanto cada uma já saiu da capital."
      />

      <AnchorFigure
        value={pe.share.replace(" da receita", "")}
        caption={`da receita líquida está em Paraná — ${pe.revenue} contra ${ce.revenue} no Santa Catarina`}
        scope={`São ${cities.value} municípios ao todo (${cities.caption}), mas o Santa Catarina ainda concentra ${fmtPct(100 - interiorShare("SC"))} do que vende na região metropolitana de Florianópolis.`}
      />

      <Section title="Paraná e Santa Catarina" explain={EXPLAIN.regions}>
        <RegionCards items={regionStats()} />
      </Section>

      <Section
        title="Quanto cada praça saiu da capital"
        description={`Paraná já leva ${fmtPct(interiorShare("PR"))} da receita para fora da região metropolitana. O Santa Catarina leva ${fmtPct(interiorShare("SC"))} — é uma operação de Florianópolis e entorno.`}
        explain={EXPLAIN.geo}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SplitBar title="Paraná" parts={geoConcentration("PR")} explain={EXPLAIN.geo} />
          <SplitBar title="Santa Catarina" parts={geoConcentration("SC")} explain={EXPLAIN.geo} />
        </div>
      </Section>

      <Section title="Municípios por receita" explain={EXPLAIN.cities}>
        <RankBars
          title="top municípios · duas praças"
          hint="participação na receita líquida total"
          items={topCities(10)}
          explain={EXPLAIN.cities}
        />
      </Section>

      <Section
        title="Paraná em detalhe"
        explain={EXPLAIN.cities}
        description="Os doze municípios que mais faturam em PE, com margem e tamanho de carteira."
        emphasis="quiet"
      >
        <DataTable
          headers={CITY_TABLE_HEADERS}
          rows={cityTable("PR")}
          bars
          quiet
          caption="Ipojuca chama atenção: alta receita com poucos clientes — é o polo hoteleiro de Porto de Galinhas, não um mercado pulverizado."
        />
      </Section>

      <Section
        title="Santa Catarina em detalhe"
        explain={EXPLAIN.cities}
        description="Os doze municípios que mais faturam em CE, com margem e tamanho de carteira."
        emphasis="quiet"
      >
        <DataTable
          headers={CITY_TABLE_HEADERS}
          rows={cityTable("SC")}
          bars
          quiet
          caption="Aquiraz repete o padrão de Ipojuca — poucos clientes de ticket muito alto, ligados ao turismo."
        />
      </Section>

      <Section
        title="Municípios atendidos"
        description="Todos os municípios da base, ordenados por receita."
        footer="SALVADOR e ANANINDEUA aparecem na lista do Santa Catarina porque a base as rotula assim — são cerca de 89 registros cujo CEP fica fora da UF declarada. Ficam à vista em vez de escondidos."
        emphasis="quiet"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChipList title="Paraná" items={cityNames("PR")} mono collapsedCount={14} />
          <ChipList title="Santa Catarina" items={cityNames("SC")} mono collapsedCount={14} />
        </div>
      </Section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AnchorFigure } from "@/components/novara/AnchorFigure";
import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { Panel } from "@/components/novara/Block";
import { NovaraMap } from "@/components/novara/Map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Section } from "@/components/novara/Section";
import {
  CITIES,
  EXPLAIN,
  NEIGHBORHOOD_COVERAGE_HEADERS,
  NEIGHBORHOOD_TABLE_HEADERS,
  cityMapPoints,
  citiesWithNeighborhoods,
  topNeighborhoodHero,
  neighborhoodCoverage,
  neighborhoodMapPoints,
  neighborhoodTable,
  neighborhoodUnmapped,
} from "@/lib/novara/engine";

export const Route = createFileRoute("/mapa")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mapa · Base interna Novara" },
      {
        name: "description",
        content:
          "Receita por bairro em Curitiba, Florianópolis e nos demais municípios da base — com o que o CEP não consegue localizar, à vista.",
      },
      { property: "og:title", content: "Mapa · Base interna Novara" },
      {
        property: "og:description",
        content:
          "Concentração de receita por bairro, cidade a cidade, com a cobertura da geocodificação sempre visível.",
      },
    ],
  }),
  component: Mapa,
});

function Mapa() {
  const cities = useMemo(() => citiesWithNeighborhoods(), []);
  const [selected, setSelected] = useState<string | null>(null);

  const cityPoints = useMemo(() => cityMapPoints(), []);
  const nbPoints = useMemo(() => (selected ? neighborhoodMapPoints(selected) : []), [selected]);
  const table = useMemo(
    () => (selected ? neighborhoodTable(selected) : []),
    [selected],
  );
  const unmapped = useMemo(() => (selected ? neighborhoodUnmapped(selected) : null), [selected]);
  const selectedCoords = useMemo(() => {
    if (!selected) return null;
    const c = CITIES.find((c) => c.name.toUpperCase() === selected.toUpperCase());
    return c && c.lat !== null && c.lon !== null ? { lat: c.lat, lon: c.lon } : null;
  }, [selected]);

  const points = selected ? nbPoints : cityPoints;
  const hero = topNeighborhoodHero();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Mapa"
        subtitle="Receita por bairro nas praças onde o CEP aponta um endereço. Onde não aponta, o mapa mostra quanto fica de fora — não esconde."
      />

      <AnchorFigure value={hero.value} caption={hero.caption} scope={hero.scope} />

      <Section
        title="Concentração de receita"
        description="82 municípios na visão geral. Selecione um para ver a receita dividida por bairro."
        explain={EXPLAIN.map}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selected ?? "__all__"}
                onValueChange={(v) => setSelected(v === "__all__" ? null : v)}
              >
                <SelectTrigger className="w-[16rem]">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as cidades (82)</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected ? (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  voltar às 82 cidades
                </button>
              ) : null}
            </div>

            <NovaraMap
              title={selected ? `Bairros de ${selected}` : "82 municípios · Paraná e Santa Catarina"}
              points={points}
              selectedCity={selectedCoords}
              explain={EXPLAIN.map}
            />
          </div>

          <div className="flex flex-col gap-4">
            {selected ? (
              <>
                <DataTable headers={NEIGHBORHOOD_TABLE_HEADERS} rows={table} bars />
                {unmapped ? (
                  <Panel
                    className={`border-dashed ${unmapped.lowCoverage ? "bg-lost/10" : "bg-surface-sunken"}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      não mapeado em {unmapped.city}
                    </p>
                    <p className="num mt-1.5 text-xl font-semibold text-foreground">
                      {unmapped.revenue}
                    </p>
                    <p className="num text-xs text-muted-foreground">{unmapped.share} da cidade</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      CEPs sem bairro identificado no cache de geocodificação — a receita está
                      contada na cidade, mas não vira bolha no mapa.
                    </p>
                  </Panel>
                ) : null}
              </>
            ) : (
              <Panel className="border-dashed bg-surface-sunken">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Selecione uma cidade para ver a receita dividida por bairro, o ranking e o que
                  ficou sem bairro identificado.
                </p>
              </Panel>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Cobertura da geocodificação"
        description="Quanto da receita de cada município tem bairro identificado. Onde a cobertura é baixa, o mapa daquela cidade mostra poucos pontos — não porque a receita seja pequena, mas porque o CEP não aponta um bairro."
      >
        <DataTable
          headers={NEIGHBORHOOD_COVERAGE_HEADERS}
          rows={neighborhoodCoverage(20)}
          bars
          caption="Aquiraz e Fernando de Noronha têm cobertura baixa: CEPs de área rural ou de resort que a geocodificação não resolve a um bairro."
        />
      </Section>
    </div>
  );
}

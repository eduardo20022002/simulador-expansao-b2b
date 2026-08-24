import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Panel } from "@/components/novara/Block";
import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import { SourceLegendTable } from "@/components/novara/SourceLegendTable";
import {
  CRITERIA_SOURCES,
  EXTERNAL_SOURCES,
  SOURCE_DEPENDENCY_HEADERS,
  SOURCE_DEPENDENCY_ROWS,
} from "@/lib/novara/fontesExternas";

export const Route = createFileRoute("/externos/")({
  head: () => ({
    meta: [
      { title: "Fonte externa · Visão geral" },
      {
        name: "description",
        content:
          "De onde vem cada dado externo usado no estudo de expansão da Novara: IBGE (CEMPRE, PAC, Malhas, PNAD Contínua), BrasilAPI e pesquisa dirigida, organizado por critério de decisão.",
      },
      { property: "og:title", content: "Fonte externa · Visão geral" },
      {
        property: "og:description",
        content:
          "O que a base interna não responde, e de onde veio o dado que preenche essa lacuna.",
      },
    ],
  }),
  component: FonteExternaVisaoGeral,
});

function FonteExternaVisaoGeral() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Fonte externa"
        subtitle="A base interna da Novara responde vendas, margem e mix em Curitiba e Florianópolis. Tudo que ela não responde — tamanho de mercado em cidade nova, tributação, mão de obra, concorrência — veio de fonte pública ou de pesquisa dirigida. Cada critério de decisão do case tem sua própria sub-aba, com o dado completo."
      />

      <Section
        title="Por critério de decisão"
        description="Cada critério do case vira uma sub-aba própria, com fonte interna, fonte externa e o resultado nas 4 cidades candidatas."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CRITERIA_SOURCES.map((c) => (
            <Link
              key={c.number}
              to={c.url}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
            >
              <Panel className="flex h-full items-center justify-between gap-4 transition-colors group-hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <span className="num rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {c.number}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{c.title}</span>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </Panel>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="Legenda das fontes"
        description="Referência única, citada por nome em cada sub-aba e nos documentos de metodologia do case."
      >
        <SourceLegendTable items={EXTERNAL_SOURCES} />
      </Section>

      <Section
        title="Dependência de fonte — resumo"
        description="Nenhum critério depende de dado privado ou pago: é base interna já legítima da Novara, fonte pública gratuita (IBGE, em sua maioria) ou pesquisa web aberta."
        footer="Toda fonte é citada por linha nos documentos de apoio do case (pesquisa_icms_27_estados.md, pesquisa dirigida, e as metodologias por critério)."
      >
        <DataTable headers={SOURCE_DEPENDENCY_HEADERS} rows={SOURCE_DEPENDENCY_ROWS} quiet />
      </Section>
    </div>
  );
}

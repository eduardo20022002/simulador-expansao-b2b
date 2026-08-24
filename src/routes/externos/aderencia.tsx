import { createFileRoute } from "@tanstack/react-router";

import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import { SourceNote } from "@/components/novara/SourceNote";
import { ADERENCIA_HEADERS, ADERENCIA_ROWS } from "@/lib/novara/fontesExternas";

export const Route = createFileRoute("/externos/aderencia")({
  head: () => ({
    meta: [
      { title: "5. Aderência estratégica · Fonte externa" },
      {
        name: "description",
        content:
          "Alinhamento de cada cidade candidata com a tese pública dos fundadores da Novara — proxy de scorecard de diretor.",
      },
      { property: "og:title", content: "5. Aderência estratégica · Fonte externa" },
      {
        property: "og:description",
        content:
          "Mesmo vencendo nos Critérios 1–4, a cidade empurra a Novara na direção que a liderança já decidiu?",
      },
    ],
  }),
  component: Aderencia,
});

function Aderencia() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="5. Aderência à estratégia interna"
        subtitle="Mesmo que a cidade vença nos Critérios 1–4, ela empurra a Novara na direção que a própria liderança já decidiu seguir? Filtro/desempate qualitativo — não entra no VPL, valida coerência contra a tese pública dos fundadores ('3º mercado no Sul', mercados menores/menos competitivos antes de escalar)."
      />

      <SourceNote
        internal="Nenhuma."
        external="Pesquisa dirigida sobre a própria Novara — imprensa (Brazil Journal, Forbes Brasil, TechCrunch, Bloomberg Línea, Diário de Paraná, Abrasel PE/CE), bases de VC (CB Insights), bases de CNPJ (Casa dos Dados, Econodata, CNPJá)."
      />

      <Section
        title="Método"
        description="Scorecard qualitativo 1–10, respondido pelos diretores responsáveis pela estratégia — mesma mecânica do subcritério 4.2, mas com foco em alinhamento futuro, não conhecimento presente."
        footer="Risco a declarar: 4.2 e este critério são respondidos pelos mesmos diretores com o mesmo método — podem sair correlacionados (viés de 'gostar' da cidade contaminando as duas notas)."
      />

      <Section
        title="Proxy de diretor — ancorado em fato público (pesquisa dirigida)"
        description="5 subperguntas ligadas direto à tese pública dos fundadores. Não substitui a resposta real da diretoria, ainda pendente."
        footer="Uberlândia bate quase ponto a ponto com a tese pública — Sul, mais contígua de todas (251km de Curitiba), mercado menor que as outras 3. Porto Alegre é Sul mas grande e disputada demais — bate parcial."
      >
        <DataTable headers={ADERENCIA_HEADERS} rows={ADERENCIA_ROWS} quiet />
      </Section>
    </div>
  );
}

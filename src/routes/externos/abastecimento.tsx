import { createFileRoute } from "@tanstack/react-router";

import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import { SourceNote } from "@/components/novara/SourceNote";
import { ABASTECIMENTO_HEADERS, ABASTECIMENTO_ROWS } from "@/lib/novara/fontesExternas";

export const Route = createFileRoute("/externos/abastecimento")({
  head: () => ({
    meta: [
      { title: "3. Abastecimento · Fonte externa" },
      {
        name: "description",
        content:
          "Disponibilidade e distância dos polos fornecedores nacionais para as 4 cidades candidatas.",
      },
      { property: "og:title", content: "3. Abastecimento · Fonte externa" },
      {
        property: "og:description",
        content:
          "A Novara consegue suprir o mix de produtos que já vende hoje, a partir de cada cidade?",
      },
    ],
  }),
  component: Abastecimento,
});

function Abastecimento() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="3. Abastecimento do CD"
        subtitle="Para cada cidade candidata, a Novara consegue suprir o mix de produtos que já vende hoje (Curitiba/Florianópolis), com fornecedores disponíveis dentro de uma distância operacionalmente viável do CD?"
      />

      <SourceNote
        internal="product_category × net_revenue — lista-mestra das 48 categorias de produto e peso% de cada uma no mix real (base inteira)."
        external="IBGE Classificação CNAE (API v2) para mapear categoria→CNAE de fornecedor; IBGE CEMPRE/SIDRA (nível UF e município) para contagem e porte de fornecedor; IBGE Malhas para distância aos polos fornecedores."
      />

      <Section
        title="Metodologia"
        description="As 48 categorias de produto da base foram mapeadas para 34 CNAEs únicos. Para cada categoria, identificados os top-5 UFs fornecedoras (nº de empresas, CEMPRE) e calculada a distância ponderada de cada cidade candidata até os centróides dessas UFs."
        footer="Achado: São Paulo lidera em 44 das 48 categorias — por si só não diferencia as candidatas. O que diferencia é a distância de cada cidade até os polos (SP, MG, PR, RS, BA aparecem recorrentes)."
      />

      <Section
        title="Score_abastecimento e nota do Critério 3"
        description="Score_abastecimento_cidade = Σ (peso%_categoria × distância_média_ponderada_categoria). Menor score = melhor posicionada — mais perto, em média, dos polos fornecedores nacionais."
        footer="Campinas lidera com folga — está dentro do próprio eixo industrial Sudeste, onde a maioria dos polos top-5 se concentra. Uberlândia é a mais distante — mesmo padrão geográfico visto em outros subcritérios."
      >
        <DataTable headers={ABASTECIMENTO_HEADERS} rows={ABASTECIMENTO_ROWS} />
      </Section>
    </div>
  );
}

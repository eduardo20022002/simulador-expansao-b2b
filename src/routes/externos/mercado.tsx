import { createFileRoute } from "@tanstack/react-router";

import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import { SourceNote } from "@/components/novara/SourceNote";
import {
  CRESCIMENTO_HEADERS,
  CRESCIMENTO_ROWS,
  CRITERIO1_HEADERS,
  CRITERIO1_ROWS,
  ENTORNO_HEADERS,
  ENTORNO_ROWS,
  SAM_SOM_HEADERS,
  SAM_SOM_ROWS,
  TAM_HEADERS,
  TAM_ROWS,
} from "@/lib/novara/fontesExternas";

export const Route = createFileRoute("/externos/mercado")({
  head: () => ({
    meta: [
      { title: "1. Mercado · Fonte externa" },
      {
        name: "description",
        content:
          "TAM, SAM, SOM, crescimento e entorno das 4 cidades candidatas — Porto Alegre, Campinas, Brasília e Uberlândia.",
      },
      { property: "og:title", content: "1. Mercado · Fonte externa" },
      {
        property: "og:description",
        content: "Quanto vale o mercado endereçável em cada cidade candidata, e quanto ele cresce.",
      },
    ],
  }),
  component: Mercado,
});

function Mercado() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="1. Mercado"
        subtitle="Quanta receita a Novara consegue capturar em cada cidade candidata, e por quanto tempo essa receita cresce. TAM vem de cima (IBGE PAC, rateado por nº de atacadistas); SAM vem de baixo (ticket médio real da Novara × contagem oficial de CNPJs-alvo); SOM é o SAM multiplicado pela penetração esperada."
      />

      <SourceNote
        internal="net_revenue por customer_category e cep (proxy de cliente cep+categoria) → ticket médio real por categoria, calibrado sobre toda a base (97 cidades). Latitude/longitude para o raio empírico de Curitiba/Florianópolis."
        external="IBGE PAC (Tabela 12/2023) para o TAM; IBGE CEMPRE/SIDRA (tabela 9418, variável 2585) para contagem de empresas por CNAE; IBGE Malhas e Localidades para centróide e distância do entorno."
      />

      <Section
        title="1.1 — TAM (de cima para baixo)"
        description="Receita do comércio atacadista da UF (IBGE PAC 2023), rateada pela participação de nº de atacadistas da cidade sobre o estado (CEMPRE). Brasília não tem rateio: o DF não tem municípios — Brasília é o DF inteiro para o IBGE."
      >
        <DataTable headers={TAM_HEADERS} rows={TAM_ROWS} />
      </Section>

      <Section
        title="1.1 — SAM e SOM (de baixo para cima)"
        description="SAM = Σ (nº de empresas por CNAE-alvo × ticket médio anual da Novara naquela categoria), sem a CNAE Hospitalar (contagem implausível, ver limitação abaixo). SOM = SAM × 8,2% (penetração de Florianópolis, âncora conservadora de cidade nova)."
        footer="Limitação: a CNAE 86.10-1 (Hospitalar) deu contagem implausível em 4 municípios (em 4 municípios menores da amostra) e foi excluída de todo o cálculo de SAM/SOM. Validado contra Curitiba: SAM teórico R$204,34mi vs. receita real R$82,52mi anualizada → penetração implícita 40,4%, plausível."
      >
        <DataTable headers={SAM_SOM_HEADERS} rows={SAM_SOM_ROWS} />
      </Section>

      <Section
        title="1.2 — Potencial de crescimento"
        description="CAGR de nº de empresas-alvo (CEMPRE, 2022–2024, sem Hospitalar), projetado para 2029 (5 anos após o último dado disponível)."
        footer="Limitação: série de só 3 anos — Porto Alegre e Uberlândia tiveram queda entre 2023→2024 que o CAGR ponta-a-ponta não capta."
      >
        <DataTable headers={CRESCIMENTO_HEADERS} rows={CRESCIMENTO_ROWS} />
      </Section>

      <Section
        title="1.3 — Mercado no entorno (raio de 312km)"
        description="Raio médio dos 2 CDs reais (Curitiba 361,3km, Florianópolis 263km). Métrica final é SAM médio por município (não SAM total bruto), para corrigir o viés de densidade administrativa — Minas Gerais tem 853 municípios, o dobro da Bahia."
        footer="Excluídas do entorno: outras capitais de estado inteiras que caíam dentro do raio (Goiânia no entorno de Brasília; Curitiba e João Pessoa no entorno de Uberlândia) — são outra decisão de expansão independente, não 'cidade satélite' da candidata."
      >
        <DataTable headers={ENTORNO_HEADERS} rows={ENTORNO_ROWS} />
      </Section>

      <Section
        title="Nota do Critério 1"
        description="Nota_Critério1 = 0,50 × nota 1.1 (SAM sede) + 0,25 × nota 1.2 (crescimento) + 0,25 × nota 1.3 (entorno)."
      >
        <DataTable headers={CRITERIO1_HEADERS} rows={CRITERIO1_ROWS} quiet />
      </Section>
    </div>
  );
}

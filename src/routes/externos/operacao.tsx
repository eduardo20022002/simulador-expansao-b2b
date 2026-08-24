import { createFileRoute } from "@tanstack/react-router";

import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import { SourceNote } from "@/components/novara/SourceNote";
import {
  CRITERIO2_HEADERS,
  CRITERIO2_ROWS,
  LOGISTICA_HEADERS,
  LOGISTICA_ROWS,
  TICKET_HEADERS,
  TICKET_ROWS,
} from "@/lib/novara/fontesExternas";

export const Route = createFileRoute("/externos/operacao")({
  head: () => ({
    meta: [
      { title: "2. Operação · Fonte externa" },
      {
        name: "description",
        content:
          "Ticket médio provável, frequência, margem e custo logístico das 4 cidades candidatas.",
      },
      { property: "og:title", content: "2. Operação · Fonte externa" },
      {
        property: "og:description",
        content: "Dado que a Novara conquista um cliente, quanto sobra de margem por cliente.",
      },
    ],
  }),
  component: Operacao,
});

function Operacao() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="2. Operação"
        subtitle="Dado que a Novara conquista um cliente na cidade nova (Critério 1), quanto sobra de margem por cliente depois do custo de servi-lo. 4 subcritérios: ticket médio provável, frequência de compra, margem bruta, custo logístico de entrega."
      />

      <SourceNote
        internal="net_revenue por região (PE, CE) para o ticket real de calibração; gross_profit = net_revenue + cogs para a margem real; latitude/longitude de cada cliente real para a dispersão."
        external="IBGE CEMPRE/SIDRA (variável 662, massa salarial + 2585, nº empresas) nível UF, como proxy de porte; BrasilAPI CEP e IBGE Malhas para geocodificação e centróide das 4 candidatas."
      />

      <Section
        title="2.1 — Ticket médio provável"
        description="Índice de porte relativo: massa salarial média por empresa-alvo (CEMPRE, nível UF), calibrado contra o ticket real de PE (R$1.986,90/mês) → K = 0,00573103 × porte médio da UF."
        footer="Validado contra Santa Catarina: erro residual de −10,9% (modelo subestima, direção conservadora). É um proxy — massa salarial, não faturamento — calibrado com 1 único par de pontos reais (PE↔CE)."
      >
        <DataTable headers={TICKET_HEADERS} rows={TICKET_ROWS} />
      </Section>

      <Section
        title="2.2 — Frequência de compra"
        description="Frequência observada na base interna (Curitiba/Florianópolis), aplicada como premissa constante — não diferencia as 4 cidades candidatas."
      />

      <Section
        title="2.3 — Margem bruta"
        description="Margem real: Curitiba 14,88%, Florianópolis 12,28%. A hipótese 'logística reduz margem' foi testada contra os 2 pontos reais e falhou (Florianópolis tem logística melhor e margem menor — direção oposta à esperada)."
        footer="Decisão: usar a margem de Florianópolis (12,28%) como constante para as 4 candidatas, sem ajuste logístico calibrado — não diferencia as 4 cidades."
      />

      <Section
        title="2.4 — Custo logístico de entrega"
        description="Duas dimensões medidas em paralelo: distância média ponderada ao CD (linha-tronco) e dispersão espacial entre clientes (roteirização), via centróide de município (IBGE Malhas)."
      >
        <DataTable headers={LOGISTICA_HEADERS} rows={LOGISTICA_ROWS} />
      </Section>

      <Section
        title="Nota do Critério 2"
        description="Nota_Critério2 = média(2.1 ticket, 2.4 logística) — 2.2 (frequência) e 2.3 (margem) ficam constantes entre as 4 cidades, fora do cálculo de diferenciação."
      >
        <DataTable headers={CRITERIO2_HEADERS} rows={CRITERIO2_ROWS} quiet />
      </Section>
    </div>
  );
}

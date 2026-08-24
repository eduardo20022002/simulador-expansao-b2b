import { createFileRoute } from "@tanstack/react-router";

import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import { SourceNote } from "@/components/novara/SourceNote";
import { fmtDec, fmtPct } from "@/lib/novara/engine";
import {
  CONCORRENCIA_HEADERS,
  CONCORRENCIA_ROWS,
  CRITERIO4_HEADERS,
  CRITERIO4_ROWS,
  MAO_DE_OBRA_HEADERS,
  MAO_DE_OBRA_ROWS,
  MERCADO_LOCAL_HEADERS,
  MERCADO_LOCAL_ROWS,
  TRIBUTARIO_HEADERS,
  TRIBUTARIO_ROWS,
} from "@/lib/novara/fontesExternas";
import { rankingTributarioNacional } from "@/lib/novara/riscoTributarioUF";

const RANKING_NACIONAL_HEADERS = ["UF", "alíquota nominal", "carga estimada", "confiança", "incentivo", "nota"];
const rankingNacionalRows = rankingTributarioNacional().map((r) => ({
  key: r.uf,
  label: `${r.uf} — ${r.ufNome}`,
  cells: [fmtPct(r.aliquotaNominalPct), fmtPct(r.cargaEstimadaPct), r.confianca, r.incentivo, fmtDec(r.nota)],
}));

export const Route = createFileRoute("/externos/risco")({
  head: () => ({
    meta: [
      { title: "4. Risco e concorrência · Fonte externa" },
      {
        name: "description",
        content:
          "Risco tributário, conhecimento de mercado, mão de obra e concorrência das 4 cidades candidatas — o haircut aplicado sobre o VPL.",
      },
      { property: "og:title", content: "4. Risco e concorrência · Fonte externa" },
      {
        property: "og:description",
        content: "O quão provável é que o valor projetado nos Critérios 1–3 de fato se realize?",
      },
    ],
  }),
  component: Risco,
});

function Risco() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="4. Risco e concorrência"
        subtitle="O quão provável é que o valor projetado nos Critérios 1–3 de fato se realize, dado o risco tributário, o desconhecimento local, a disponibilidade de mão de obra e a concorrência já instalada? Único critério que não gera R$ diretamente — gera um haircut aplicado sobre o VPL."
      />

      <SourceNote
        internal="Nenhuma."
        external="Pesquisa dirigida (SEFAZ, RICMS, agregadores tributários) para o risco tributário; IBGE Malhas para o proxy de conhecimento de mercado; IBGE PNAD Contínua/SIDRA para mão de obra; IBGE CEMPRE/SIDRA + pesquisa dirigida de concorrência digital."
      />

      <Section
        title="4.1 — Risco tributário"
        description="Carga efetiva de ICMS (não a alíquota nominal) — cenário conservador, condicionado a habilitação em regime especial onde aplicável."
        footer="Limitação: pesquisa dirigida, majoritariamente agregadores tributários privados cruzados, não fonte primária única — recomenda-se validação com tributarista antes de virar número definitivo."
      >
        <DataTable headers={TRIBUTARIO_HEADERS} rows={TRIBUTARIO_ROWS} />
      </Section>

      <Section
        title="4.1 — Ranking nacional (27 estados)"
        description="Mesmo método acima, agora para todos os estados do Brasil — não só as 4 candidatas. Reaproveita a pesquisa dirigida já feita (pesquisa_icms_27_estados.md); não é ao vivo, porque não existe API pública de alíquota/incentivo fiscal por estado. Nota é min-max invertido (menor carga = melhor) sobre as 27 UFs."
        footer="Confiança 'alta' = percentual final confirmado em decreto/lei, com escopo atacadista/CD explícito. 'Baixa'/'média' = incentivo existe mas percentual não confirmável para o setor — usa a alíquota nominal, postura conservadora (nunca presume redução sem confirmação)."
        emphasis="quiet"
      >
        <DataTable headers={RANKING_NACIONAL_HEADERS} rows={rankingNacionalRows} quiet />
      </Section>

      <Section
        title="4.2 — Conhecimento de mercado local (proxy)"
        description="Método real é scorecard qualitativo respondido pela diretoria da Novara — ainda pendente. Proxy provisório: distância à operação real mais próxima + mesma região (Sul)."
        footer="Substituto temporário, não o dado real — quando a diretoria responder o scorecard, esta nota deve ser substituída inteiramente, não combinada."
      >
        <DataTable headers={MERCADO_LOCAL_HEADERS} rows={MERCADO_LOCAL_ROWS} />
      </Section>

      <Section
        title="4.3 — Disponibilidade de mão de obra"
        description="Estoque de trabalhadores/PEA, rendimento médio e taxa de desemprego, por grupamento ocupacional (PNAD Contínua/SIDRA, 2026 T2) — RAIS/CAGED por CBO exata está indisponível."
      >
        <DataTable headers={MAO_DE_OBRA_HEADERS} rows={MAO_DE_OBRA_ROWS} />
      </Section>

      <Section
        title="4.4 — Concorrência"
        description="2 camadas: física (SAM ÷ nº de concorrentes por CNAE 46) e digital (pesquisa dirigida de distribuidores B2B nacionais). Nenhuma concorrência digital confirmada em nenhuma das 4 candidatas — 'oceano azul' digital."
      >
        <DataTable headers={CONCORRENCIA_HEADERS} rows={CONCORRENCIA_ROWS} />
      </Section>

      <Section
        title="Nota do Critério 4 e haircut sobre o VPL"
        description="Nota_Critério4 = 0,30×4.1 + 0,20×4.2 + 0,25×4.3 + 0,25×4.4. Haircut = 5% (piso) + 30% × (10 − Nota_Critério4) / 10."
      >
        <DataTable headers={CRITERIO4_HEADERS} rows={CRITERIO4_ROWS} quiet />
      </Section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { Panel } from "@/components/novara/Block";
import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import { Badge } from "@/components/ui/badge";
import {
  CENARIOS,
  CRITERIOS,
  NOTA_POR_CRITERIO,
  RESULTADO_POR_CENARIO,
  type Subcriterio,
} from "@/lib/novara/metodologia";

export const Route = createFileRoute("/metodologia")({
  head: () => ({
    meta: [
      { title: "Metodologia · Novara" },
      {
        name: "description",
        content:
          "O passo a passo completo de cada critério e subcritério do case — da pergunta de negócio ao algoritmo, com os 4 cenários de peso e como foram concebidos.",
      },
      { property: "og:title", content: "Metodologia · Novara" },
    ],
  }),
  component: Metodologia,
});

const NAV = [
  { href: "#pergunta", label: "Pergunta de negócio" },
  ...CRITERIOS.map((c) => ({
    href: `#${c.id}`,
    label: `${c.numero}. ${c.titulo}`,
    sub: c.subcriterios.map((s) => ({ href: `#${s.id}`, label: s.titulo })),
  })),
  { href: "#cenarios", label: "Cenários de peso" },
];

function SubcriterioCard({ s }: { s: Subcriterio }) {
  return (
    <div id={s.id} className="scroll-mt-24">
      <Panel className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{s.titulo}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {s.pergunta}
            </p>
          </div>
          <Badge variant={s.aoVivo ? "default" : "outline"} className="shrink-0">
            {s.aoVivo ? "ao vivo no simulador" : "proxy / pendente"}
          </Badge>
        </div>

        {s.fonteInterna || s.fonteExterna ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {s.fonteInterna ? (
              <div className="rounded-lg border border-border/60 bg-surface-sunken p-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                  fonte interna
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground">{s.fonteInterna}</p>
              </div>
            ) : null}
            {s.fonteExterna ? (
              <div className="rounded-lg border border-border/60 bg-surface-sunken p-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                  fonte externa
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground">{s.fonteExterna}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            passo a passo
          </p>
          <ol className="mt-2 flex flex-col gap-2">
            {s.passos.map((passo, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                <span className="num mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground">
                  {i + 1}.
                </span>
                <span>{passo}</span>
              </li>
            ))}
          </ol>
        </div>

        {s.formula ? (
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              fórmula
            </p>
            <p className="num mt-2 overflow-x-auto rounded-md bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-foreground">
              {s.formula}
            </p>
          </div>
        ) : null}

        {s.armadilhas && s.armadilhas.length > 0 ? (
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              armadilhas conhecidas
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {s.armadilhas.map((a, i) => (
                <li
                  key={i}
                  className="border-l-2 border-lost/50 pl-3 text-xs leading-relaxed text-muted-foreground"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {s.resultado ? (
          <p className="border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
            {s.resultado}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

const NOTA_POR_CRITERIO_HEADERS = ["critério", "Porto Alegre (RS)", "Campinas (SP)", "Goiânia (GO)", "Uberlândia (MG)"];
const notaPorCriterioRows = NOTA_POR_CRITERIO.map((r) => ({
  key: r.criterio,
  label: r.criterio,
  cells: [r.salvador, r.bh, r.brasilia, r.natal],
}));

const PESOS_HEADERS = ["cenário", "1. Mercado", "2. Operação", "3. Abastec.", "4. Risco", "5. Aderência"];
const pesosRows = CENARIOS.map((c) => ({
  key: c.nome,
  label: c.nome,
  cells: c.pesos.map((p) => p.peso),
}));

const RESULTADO_HEADERS = ["cidade", "Base", "Cresc. + Operacional", "Conservador ajustado", "Foco Estratégia Interna"];
const resultadoRows = RESULTADO_POR_CENARIO.map((r) => ({
  key: r.cidade,
  label: r.cidade,
  cells: [r.base, r.crescOperacional, r.conservador, r.foco],
}));

function Metodologia() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Metodologia"
        subtitle="Da pergunta de negócio até a nota final de cada cidade candidata: o passo a passo completo de cada critério e subcritério — fonte, algoritmo, fórmula e armadilhas conhecidas — e como os 4 cenários de peso foram concebidos."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Sumário da metodologia"
          className="flex flex-col gap-1 lg:sticky lg:top-20 lg:h-fit lg:self-start"
        >
          <p className="px-2 pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            navegar
          </p>
          {NAV.map((item) => (
            <div key={item.href} className="flex flex-col">
              <a
                href={item.href}
                className="rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {item.label}
              </a>
              {"sub" in item && item.sub ? (
                <div className="ml-3 flex flex-col border-l border-border/60 pl-2">
                  {item.sub.map((sub) => (
                    <a
                      key={sub.href}
                      href={sub.href}
                      className="truncate rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {sub.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-14">
          <div id="pergunta" className="scroll-mt-24">
            <Section
              title="Pergunta de negócio"
              description="Qual cidade — entre Porto Alegre (RS), Campinas (SP), Goiânia (GO) e Uberlândia (MG) — maximiza o valor econômico de uma nova operação da Novara?"
            >
              <Panel className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-foreground">
                  A resposta combina duas camadas. Uma <strong>camada financeira</strong> — o VPL de 5
                  anos dos Critérios 1–3 (Mercado, Operação, Abastecimento), líquido do CAPEX de
                  ~R$15 milhões por CD — que dá o tamanho do prêmio em reais. E uma{" "}
                  <strong>camada de score</strong>, usando o método de decisão multicritério{" "}
                  <strong>MCDA / Simple Additive Weighting (SAW)</strong>: cada subcritério — não
                  importa a natureza (R$, km, %, nota qualitativa de diretor) — vira uma nota 0–10
                  relativa à amostra das 4 candidatas (min-max), agregada em nota por critério e
                  depois em nota final ponderada entre os 5 critérios.
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  Em vez de travar um único conjunto de pesos entre os 5 critérios — o que seria
                  arbitrário demais para uma decisão dessa magnitude — a análise roda{" "}
                  <strong>4 cenários nomeados de peso</strong> (ver a seção Cenários, ao final desta
                  página), testando diferentes prioridades estratégicas. Se o 1º colocado não muda
                  entre cenários, isso é uma conclusão forte de robustez; se muda, o ponto de virada
                  também é informação valiosa — não um problema a esconder.
                </p>
              </Panel>
            </Section>
          </div>

          {CRITERIOS.map((criterio) => (
            <div key={criterio.id} id={criterio.id} className="flex scroll-mt-24 flex-col gap-6">
              <Section
                title={`Critério ${criterio.numero} — ${criterio.titulo}`}
                description={criterio.pergunta}
                footer={
                  criterio.pesoInterno ? (
                    <>
                      <strong>Peso interno:</strong> {criterio.pesoInterno}
                      {criterio.notaFormula ? (
                        <>
                          {" "}
                          · <span className="num">{criterio.notaFormula}</span>
                        </>
                      ) : null}
                    </>
                  ) : undefined
                }
              />
              <div className="flex flex-col gap-4">
                {criterio.subcriterios.map((s) => (
                  <SubcriterioCard key={s.id} s={s} />
                ))}
              </div>
            </div>
          ))}

          <div id="cenarios" className="flex scroll-mt-24 flex-col gap-8">
            <Section
              title="Cenários de peso — como foram concebidos"
              description="Travar um único peso entre os 5 critérios esconderia que a prioridade estratégica de quem decide (crescer rápido vs. crescer com menos risco, por exemplo) muda o resultado. Em vez de uma matriz exaustiva de combinações, foram testados 4 cenários nomeados — mais rápido e mais legível para reportar do que um método par-a-par tipo AHP."
            />

            <Section
              title="Nota por critério (0–10, min-max entre as 4 candidatas)"
              description="A entrada dos cenários — o que muda entre eles é só o peso aplicado sobre estas mesmas 5 notas."
              footer="Nenhuma cidade vence em todos os critérios: Brasília e Campinas dominam Mercado/Operação/Abastecimento (o lado da oportunidade); Porto Alegre e Uberlândia dominam Risco e Aderência (o lado da execução e da coerência estratégica) — é essa tensão que faz a recomendação final depender de peso, não de um vencedor óbvio."
              emphasis="quiet"
            >
              <DataTable headers={NOTA_POR_CRITERIO_HEADERS} rows={notaPorCriterioRows} quiet />
            </Section>

            <Section
              title="Pesos por cenário (somam 100% em cada linha)"
              emphasis="quiet"
            >
              <DataTable headers={PESOS_HEADERS} rows={pesosRows} quiet />
              <div className="mt-4 flex flex-col gap-3">
                {CENARIOS.map((c) => (
                  <p key={c.nome} className="text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">{c.nome}:</strong> {c.leitura}
                  </p>
                ))}
              </div>
            </Section>

            <Section
              title="Nota final por cenário (Σ peso × nota_critério)"
              description="★ marca a cidade vencedora em cada cenário."
              footer="Brasília vence em 2 dos 4 cenários (Base e Crescimento + Operacional) — os que não sobrecarregam Risco nem Aderência. Porto Alegre vence nos outros 2 (Conservador ajustado e Foco na Estratégia Interna) — os que testam a decisão pela ótica de execução mais segura ou de coerência com o plano já sinalizado pelos fundadores. Uberlândia nunca vence, mas chega perto no cenário que mais a favorece; Campinas não vence em nenhum dos 4."
              emphasis="quiet"
            >
              <DataTable headers={RESULTADO_HEADERS} rows={resultadoRows} quiet />
            </Section>

            <Panel quiet className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                limitações a declarar
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Os pesos entre os 5 critérios e os pesos internos de cada critério são decisões
                desta análise, não valores canônicos — defensáveis e documentados, mas outra pessoa
                priorizando diferente chegaria a números finais diferentes sem que o método em si
                estivesse errado. 4 cenários nomeados foram testados, não uma matriz exaustiva de
                combinações — outras combinações razoáveis poderiam revelar um ponto de virada
                diferente. Recomenda-se validar os pesos com a diretoria da Novara antes de tratá-los
                como definitivos.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

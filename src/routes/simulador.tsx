import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CitySelector } from "@/components/novara/CitySelector";
import { DataTable } from "@/components/novara/DataTable";
import { Panel } from "@/components/novara/Block";
import { PageHeader } from "@/components/novara/PageHeader";
import { Section } from "@/components/novara/Section";
import {
  calcularAbastecimento,
  type ResultadoAbastecimentoCidade,
} from "@/lib/novara/abastecimentoMercado";
import { aderenciaEstrategica, SUBPERGUNTAS } from "@/lib/novara/aderenciaEstrategica";
import { conhecimentoMercado } from "@/lib/novara/conhecimentoMercado";
import { fmtBRL, fmtBRLShort, fmtDec, fmtInt, fmtPct, fmtSigned } from "@/lib/novara/engine";
import {
  calcularMaoDeObra,
  type ResultadoMaoDeObraCidade,
} from "@/lib/novara/maoDeObraMercado";
import type { Municipio } from "@/lib/novara/municipios";
import { calcularMercado, type ResultadoMercadoCidade } from "@/lib/novara/simuladorMercado";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de mercado · Novara" },
      {
        name: "description",
        content:
          "Calcule ao vivo o SAM (mercado endereçável) e o SOM de até 5 cidades do Brasil, direto do IBGE CEMPRE/SIDRA.",
      },
      { property: "og:title", content: "Simulador de mercado · Novara" },
    ],
  }),
  component: Simulador,
});

const TAM_HEADERS = ["cidade", "TAM (mercado atacadista da cidade)"];
const SAM_SOM_HEADERS = ["cidade", "SAM (sede, sem Hospitalar)", "SOM (SAM × 8,2%)", "nota 1.1"];
const CRESCIMENTO_HEADERS = ["cidade", "empresas 2022", "empresas 2024", "CAGR", "projeção 2029", "nota 1.2"];
const ENTORNO_HEADERS = [
  "cidade",
  "SAM entorno líquido (312km)",
  "municípios",
  "SAM médio/município",
  "nota 1.3",
];
const CRITERIO1_HEADERS = ["cidade", "1.1 SAM sede (50%)", "1.2 crescimento (25%)", "1.3 entorno (25%)", "nota Critério 1"];
const TICKET_HEADERS = ["cidade", "porte médio (massa salarial/empresa, UF)", "ticket estimado", "nota 2.1"];
const LOGISTICA_HEADERS = ["cidade", "distância-tronco ponderada", "dispersão espacial", "nota 2.4"];
const CRITERIO2_HEADERS = ["cidade", "2.1 ticket", "2.4 logística", "nota Critério 2"];
const CONCORRENCIA_HEADERS = [
  "cidade",
  "concorrentes físicos (CNAE 46)",
  "mercado por concorrente",
  "nota 4.4 (física)",
];
const CONHECIMENTO_HEADERS = ["cidade", "origem", "distância à operação + próxima", "mesma região (Sul)?", "nota 4.2"];

const notaOuPendente = (n: number | null) => (n === null ? "pendente" : fmtDec(n));

/** As 4 cidades candidatas do case — mesmos códigos IBGE usados em todo o simulador e no relatório estático. */
const CANDIDATAS_CASE: Municipio[] = [
  { id: 5208707, nome: "Goiânia", uf: "GO" },
  { id: 3509502, nome: "Campinas", uf: "SP" },
  { id: 4314902, nome: "Porto Alegre", uf: "RS" },
  { id: 3170206, nome: "Uberlândia", uf: "MG" },
];
const ABASTECIMENTO_HEADERS = ["cidade", "Score_abastecimento (km ponderado)", "nota Critério 3"];
const MAO_DE_OBRA_HEADERS = [
  "cidade",
  "estoque (mil pessoas)",
  "PEA (mil pessoas)",
  "estoque/PEA",
  "rendimento médio",
  "desemprego",
  "nota 4.3",
];

const notaOuTraco = (n: number | null) => (n === null ? "—" : fmtDec(n));

function Simulador() {
  const [cidades, setCidades] = useState<Municipio[]>([]);

  const mutation = useMutation({
    mutationFn: (selecionadas: Municipio[]) =>
      calcularMercado({
        data: { cidades: selecionadas.map((c) => ({ id: c.id, nome: c.nome, uf: c.uf })) },
      }),
  });

  const abastecimentoMutation = useMutation({
    mutationFn: (selecionadas: Municipio[]) =>
      calcularAbastecimento({
        data: { cidades: selecionadas.map((c) => ({ id: c.id, nome: c.nome, uf: c.uf })) },
      }),
  });

  const maoDeObraMutation = useMutation({
    mutationFn: (selecionadas: Municipio[]) =>
      calcularMaoDeObra({
        data: { cidades: selecionadas.map((c) => ({ id: c.id, nome: c.nome, uf: c.uf })) },
      }),
  });

  const resultados = mutation.data ?? [];
  const comSucesso = resultados.filter(
    (r): r is ResultadoMercadoCidade & { erro?: undefined } => !r.erro,
  );
  const comErro = resultados.filter((r) => r.erro);
  const precisaDeMaisCidades = comSucesso.length < 2;

  const resultadosAbastecimento = abastecimentoMutation.data ?? [];
  const abastecimentoComSucesso = resultadosAbastecimento.filter(
    (r): r is ResultadoAbastecimentoCidade & { erro?: undefined } => !r.erro,
  );
  const abastecimentoComErro = resultadosAbastecimento.filter((r) => r.erro);

  const resultadosMaoDeObra = maoDeObraMutation.data ?? [];
  const maoDeObraComSucesso = resultadosMaoDeObra.filter(
    (r): r is ResultadoMaoDeObraCidade & { erro?: undefined } => !r.erro,
  );
  const maoDeObraComErro = resultadosMaoDeObra.filter((r) => r.erro);

  const label = (r: ResultadoMercadoCidade) => `${r.nome} (${r.uf})`;

  const tamRows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [
      r.tam !== null && r.participacaoTAM !== null
        ? `${fmtBRLShort(r.tam)} (${fmtPct(r.participacaoTAM * 100)} da UF)`
        : "sem dado de PAC para a UF",
    ],
  }));

  const samSomRows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [fmtBRLShort(r.samSede), fmtBRLShort(r.som), notaOuTraco(r.nota11)],
  }));

  const crescimentoRows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [
      r.emp2022 !== null ? fmtInt(r.emp2022) : "—",
      r.emp2024 !== null ? fmtInt(r.emp2024) : "—",
      r.cagr !== null ? fmtSigned(r.cagr * 100) : "—",
      r.projecao !== null ? fmtInt(r.projecao) : "—",
      notaOuTraco(r.nota12),
    ],
  }));

  const entornoRows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [
      fmtBRLShort(r.samEntorno),
      `${fmtInt(r.nMunicipiosEntorno)} município(s)`,
      r.samMedioPorMunicipio !== null ? fmtBRLShort(r.samMedioPorMunicipio) : "—",
      notaOuTraco(r.nota13),
    ],
  }));

  const criterio1Rows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [notaOuTraco(r.nota11), notaOuTraco(r.nota12), notaOuTraco(r.nota13), notaOuTraco(r.notaCriterio1)],
  }));

  const ticketRows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [
      r.porteMedioUF !== null ? fmtBRL(r.porteMedioUF) : "—",
      r.ticketEstimado !== null ? `${fmtBRL(r.ticketEstimado)}/mês` : "—",
      notaOuTraco(r.nota21),
    ],
  }));

  const logisticaRows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [
      r.distanciaTroncalKm !== null ? `${fmtDec(r.distanciaTroncalKm)} km` : "—",
      r.dispersaoKm !== null ? `${fmtDec(r.dispersaoKm)} km` : "—",
      notaOuTraco(r.nota24),
    ],
  }));

  const criterio2Rows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [notaOuTraco(r.nota21), notaOuTraco(r.nota24), notaOuTraco(r.notaCriterio2)],
  }));

  const concorrenciaRows = comSucesso.map((r) => ({
    key: String(r.id),
    label: label(r),
    cells: [
      r.concorrentesFisicos !== null ? fmtInt(r.concorrentesFisicos) : "—",
      r.mercadoPorConcorrente !== null ? fmtBRL(r.mercadoPorConcorrente) : "—",
      notaOuTraco(r.nota44Fisica),
    ],
  }));
  const precisaDeMaisCidadesConcorrencia = comSucesso.length < 2;

  const abastecimentoRows = abastecimentoComSucesso.map((r) => ({
    key: String(r.id),
    label: `${r.nome} (${r.uf})`,
    cells: [r.score !== null ? `${fmtDec(r.score)} km` : "—", notaOuTraco(r.nota)],
  }));
  const precisaDeMaisCidadesAbastecimento = abastecimentoComSucesso.length < 2;

  const maoDeObraRows = maoDeObraComSucesso.map((r) => ({
    key: String(r.id),
    label: `${r.nome} (${r.uf})`,
    cells: [
      r.estoqueMil !== null ? fmtDec(r.estoqueMil) : "—",
      r.peaMil !== null ? fmtDec(r.peaMil) : "—",
      r.estoquePorPEA !== null ? fmtPct(r.estoquePorPEA * 100) : "—",
      r.rendimentoMedio !== null ? fmtBRL(r.rendimentoMedio) : "—",
      r.desempregoPct !== null ? fmtPct(r.desempregoPct) : "—",
      notaOuTraco(r.nota),
    ],
  }));
  const precisaDeMaisCidadesMaoDeObra = maoDeObraComSucesso.length < 2;

  const ORIGEM_LABEL: Record<string, string> = {
    resposta_diretoria: "resposta da diretoria",
    proxy_provisorio: "proxy provisório (case)",
    pendente: "pendente",
  };

  const conhecimentoRows = cidades.map((c) => {
    const resultado = conhecimentoMercado(c.id);
    return {
      key: String(c.id),
      label: `${c.nome} (${c.uf})`,
      cells: [
        ORIGEM_LABEL[resultado.origem] ?? resultado.origem,
        resultado.distanciaKm !== null ? `${fmtDec(resultado.distanciaKm, 0)} km` : "—",
        resultado.mesmaRegiao === null ? "—" : resultado.mesmaRegiao ? "sim" : "não",
        notaOuTraco(resultado.nota),
      ],
    };
  });

  const ADERENCIA_HEADERS = ["subpergunta", ...cidades.map((c) => `${c.nome} (${c.uf})`)];
  const aderenciaPorCidade = cidades.map((c) => aderenciaEstrategica(c.id));
  const aderenciaRows = [
    ...SUBPERGUNTAS.map((pergunta, i) => ({
      key: `q${i}`,
      label: `${i + 1}. ${pergunta}`,
      cells: aderenciaPorCidade.map((r) => (r.subperguntas[i] !== null ? fmtInt(r.subperguntas[i]!) : "pendente")),
    })),
    {
      key: "final",
      label: "Nota final (proxy)",
      cells: aderenciaPorCidade.map((r) => notaOuPendente(r.nota)),
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Simulador de mercado"
        subtitle="Selecione de 2 a 5 cidades — de qualquer lugar do Brasil, não só as 4 candidatas do case — e calcule ao vivo os Critérios 1 a 3 e a mão de obra e a concorrência física do Critério 4. O conhecimento de mercado (4.2) e a aderência estratégica (Critério 5) são proxy/pendente, nunca ao vivo — dependem de resposta da diretoria. O risco tributário (4.1) fica só na página de Fonte externa, é um ranking fixo dos 27 estados que não muda com a seleção aqui."
      />

      <Section
        title="1. Selecione as cidades (máximo 5)"
        description="Busque por nome do município ou sigla da UF."
      >
        <div className="flex flex-col gap-3">
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCidades(CANDIDATAS_CASE)}
              className="gap-2"
            >
              Selecionar as 4 candidatas do case
            </Button>
          </div>
          <CitySelector value={cidades} onChange={setCidades} max={5} />
        </div>
      </Section>

      <div>
        <Button
          onClick={() => {
            mutation.mutate(cidades);
            abastecimentoMutation.mutate(cidades);
            maoDeObraMutation.mutate(cidades);
          }}
          disabled={
            cidades.length === 0 ||
            mutation.isPending ||
            abastecimentoMutation.isPending ||
            maoDeObraMutation.isPending
          }
          className="gap-2"
        >
          {mutation.isPending || abastecimentoMutation.isPending || maoDeObraMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {mutation.isPending || abastecimentoMutation.isPending || maoDeObraMutation.isPending
            ? "Consultando o IBGE…"
            : "Calcular tamanho de mercado"}
        </Button>
      </div>

      {mutation.isError || abastecimentoMutation.isError || maoDeObraMutation.isError ? (
        <Panel className="flex items-start gap-3 border-destructive/40 bg-destructive/5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-sm text-destructive">
            Não consegui consultar o IBGE agora. Tente novamente em alguns instantes.
          </p>
        </Panel>
      ) : null}

      {comSucesso.length > 0 ? (
        <>
          <Section
            title="1.1 — TAM (de cima para baixo)"
            description="Receita do comércio atacadista da UF (IBGE PAC 2023, Tabela 12) × participação da cidade no nº de atacadistas da UF (CEMPRE, consultado agora). Brasília não tem rateio: o DF não tem municípios — Brasília é o DF inteiro para o IBGE. TAM é só contexto — nunca entra na nota do Critério 1."
          >
            <DataTable headers={TAM_HEADERS} rows={tamRows} />
          </Section>

          <Section
            title="1.1 — SAM e SOM (de baixo para cima)"
            description="SAM = Σ (nº de empresas por CNAE-alvo, CEMPRE 2024 × ticket médio anual real da Novara, por categoria), sem a CNAE Hospitalar. SOM = SAM sede × 8,2% (âncora conservadora de Florianópolis)."
          >
            <DataTable headers={SAM_SOM_HEADERS} rows={samSomRows} />
          </Section>

          <Section
            title="1.2 — Potencial de crescimento"
            description="CAGR de nº de empresas-alvo (CEMPRE, 2022→2024, sem Hospitalar), projetado para 2029. Sempre cidade-sede, nunca entorno — um raio fixo mistura o interior com outras capitais engolidas por ele (ver algoritmo_crescimento.md)."
            footer="Limitação: série de só 3 anos — o CAGR ponta-a-ponta não capta quedas intermediárias entre 2023 e 2024."
          >
            <DataTable headers={CRESCIMENTO_HEADERS} rows={crescimentoRows} />
          </Section>

          <Section
            title="1.3 — Mercado no entorno (raio de 312km)"
            description="Raio médio dos 2 CDs reais (Curitiba 361,3km, Florianópolis 263km). Métrica final é SAM médio por município (não SAM total bruto), para corrigir o viés de densidade administrativa — o mesmo Módulo E usado nas 4 candidatas do case, agora cobrindo qualquer divisa de estado."
            footer="Excluída do entorno: qualquer capital de estado inteira que caia dentro do raio — é outra decisão de expansão independente, não 'cidade satélite' da candidata."
          >
            <DataTable headers={ENTORNO_HEADERS} rows={entornoRows} />
          </Section>

          <Section
            title="Nota do Critério 1"
            description="Nota_Critério1 = 0,50 × nota 1.1 (SAM sede) + 0,25 × nota 1.2 (crescimento) + 0,25 × nota 1.3 (entorno). Nota é min-max relativo só às cidades selecionadas agora — mude o lote e as notas mudam, por construção."
            footer={
              precisaDeMaisCidades
                ? "Selecione pelo menos 2 cidades para gerar nota — min-max não compara uma cidade sozinha."
                : "Amostra pequena amplia a distância entre as notas (a pior vira sempre 0, a melhor sempre 10) — trate como comparação relativa deste lote, não como escala absoluta."
            }
            emphasis="quiet"
          >
            <DataTable headers={CRITERIO1_HEADERS} rows={criterio1Rows} quiet />
          </Section>

          <Section
            title="2.1 — Ticket médio provável"
            description="Índice de porte relativo: massa salarial média por empresa-alvo (CEMPRE, nível UF inteira — nunca raio), calibrado contra o ticket real de PE (R$1.986,90/mês) → K = 0,00573103 × porte médio da UF."
            footer="Validado contra o Santa Catarina real: erro residual de −10,9% (o modelo subestima, direção conservadora). É um proxy — massa salarial, não faturamento — calibrado com 1 único par de pontos reais (PE↔CE); não esperar precisão maior que isso em UFs nunca observadas."
          >
            <DataTable headers={TICKET_HEADERS} rows={ticketRows} />
          </Section>

          <Section
            title="2.4 — Fricção logística"
            description="Duas dimensões: distância-tronco (haversine da sede a cada município do entorno, ponderada pelo nº de empresas-alvo) e dispersão espacial (desvio padrão em torno do centro de gravidade ponderado). Ambas incluem a própria sede — se ela concentra quase toda a massa de empresas, a distância fica perto de zero."
            footer="O método usa centróide de município (IBGE Malhas), não CEP de cliente real — o case já registrou que isso tende a superestimar a dispersão em escala absoluta (~3x, conferido contra CEP real de Curitiba/Florianópolis). O ranking relativo entre cidades continua válido; os km absolutos, não. Reaproveita o mesmo entorno do SAM (1.3) — cidades cujo entorno ao vivo cobre mais município que o relatório estático (ver nota da seção 1.3) têm distância e dispersão diferentes do número publicado, pelo mesmo motivo, não por erro novo."
          >
            <DataTable headers={LOGISTICA_HEADERS} rows={logisticaRows} />
          </Section>

          <Section
            title="Nota do Critério 2"
            description="Nota_Critério2 = média(nota 2.1, nota 2.4) — 2.2 (frequência) e 2.3 (margem) são constantes da base interna, não diferenciam cidade e ficam fora deste cálculo."
            footer={
              precisaDeMaisCidades
                ? "Selecione pelo menos 2 cidades para gerar nota — min-max não compara uma cidade sozinha."
                : "Mesma ressalva do Critério 1: nota é relativa só a este lote, não uma escala absoluta."
            }
            emphasis="quiet"
          >
            <DataTable headers={CRITERIO2_HEADERS} rows={criterio2Rows} quiet />
          </Section>

          <Section
            title="4.4 — Concorrência (camada física)"
            description="Mercado_disponível_por_concorrente = SAM sede ÷ nº de atacadistas (CNAE 46, mesma contagem já usada no rateio do TAM). Nota é min-max direto (mais mercado por concorrente = melhor). A camada digital (concorrentes B2B nacionais) fica de fora — pesquisa dirigida, não automatizável."
            footer={
              precisaDeMaisCidadesConcorrencia
                ? "Selecione pelo menos 2 cidades para gerar nota — min-max não compara uma cidade sozinha."
                : "Concorrência via CNAE é ampla — conta qualquer atacadista de alimentos, não filtra por quem compete no nicho B2B digital da Novara. Superestima concorrência física real."
            }
            emphasis="quiet"
          >
            <DataTable headers={CONCORRENCIA_HEADERS} rows={concorrenciaRows} quiet />
          </Section>
        </>
      ) : null}

      {abastecimentoComSucesso.length > 0 ? (
        <Section
          title="3. Abastecimento do CD"
          description="Score_abastecimento_cidade = Σ_categoria [peso%_categoria × distância_média_ponderada_categoria], para as 48 categorias de produto da base. Distância = haversine da cidade até a capital de cada uma das top-5 UFs fornecedoras da categoria (nº de empresas-alvo, CEMPRE 2024, consultado agora), ponderada pelo nº de empresas de cada UF no top-5. Peso% vem do mix real da base inteira. Nota é min-max invertido (menor km = melhor)."
          footer={
            precisaDeMaisCidadesAbastecimento
              ? "Selecione pelo menos 2 cidades para gerar nota — min-max não compara uma cidade sozinha."
              : "São Paulo lidera a maioria das categorias — por si só não diferencia cidade nenhuma; quem diferencia é a distância até os polos (SP, MG, PR, RS, BA tendem a aparecer recorrentes)."
          }
          emphasis="quiet"
        >
          <DataTable headers={ABASTECIMENTO_HEADERS} rows={abastecimentoRows} quiet />
        </Section>
      ) : null}

      {abastecimentoComErro.length > 0 ? (
        <Panel className="flex items-start gap-3 border-destructive/40 bg-destructive/5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="text-sm text-destructive">
            <p className="font-semibold">
              Abastecimento não calculado para: {abastecimentoComErro.map((r) => r.nome).join(", ")}
            </p>
            <p className="mt-1 text-destructive/80">{abastecimentoComErro[0]?.erro}</p>
          </div>
        </Panel>
      ) : null}

      {maoDeObraComSucesso.length > 0 ? (
        <Section
          title="4.3 — Disponibilidade de mão de obra"
          description="Estoque/PEA, rendimento médio e taxa de desemprego (IBGE PNAD Contínua/SIDRA, período mais recente), por grupamento ocupacional-proxy (operadores de máquina/instalações + vendedores/serviços) — RAIS/CAGED por CBO exata está indisponível. nota_4.3 = média(score_estoque, score_custo invertido, score_desemprego), cada um min-max relativo ao lote selecionado."
          footer={
            precisaDeMaisCidadesMaoDeObra
              ? "Selecione pelo menos 2 cidades para gerar nota — min-max não compara uma cidade sozinha."
              : "A PNAD Contínua só tem amostra suficiente pra cobrir capitais e grandes cidades — um município pequeno pode não retornar dado (ver erro abaixo, se houver)."
          }
          emphasis="quiet"
        >
          <DataTable headers={MAO_DE_OBRA_HEADERS} rows={maoDeObraRows} quiet />
        </Section>
      ) : null}

      {maoDeObraComErro.length > 0 ? (
        <Panel className="flex items-start gap-3 border-destructive/40 bg-destructive/5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="text-sm text-destructive">
            <p className="font-semibold">
              Mão de obra não calculada para: {maoDeObraComErro.map((r) => r.nome).join(", ")}
            </p>
            <p className="mt-1 text-destructive/80">{maoDeObraComErro[0]?.erro}</p>
          </div>
        </Panel>
      ) : null}

      {cidades.length > 0 ? (
        <Section
          title="4.2 — Conhecimento de mercado local"
          description="O método real é um scorecard qualitativo 1–10 respondido pelos diretores da Novara — não automatizável, precisa de input humano. Este espaço está pronto para receber essa resposta (por cidade, com nº de respondentes). Enquanto ela não chega: as 4 candidatas do case já têm o proxy provisório calculado (distância à operação mais próxima + mesma região Sul); qualquer outra cidade fica marcada como pendente — não inventamos proxy pra ela."
          footer="Quando o proxy e a resposta real coexistirem para a mesma cidade, a resposta da diretoria substitui o proxy — nunca soma com ele, os dois sinais medem a mesma coisa."
          emphasis="quiet"
        >
          <DataTable headers={CONHECIMENTO_HEADERS} rows={conhecimentoRows} quiet />
        </Section>
      ) : null}

      {cidades.length > 0 ? (
        <Section
          title="5. Aderência à estratégia interna"
          description="Scorecard qualitativo 1–10, respondido pelos diretores responsáveis pela estratégia — mesma mecânica do 4.2, mas focado em alinhamento futuro (roadmap), não conhecimento presente. Não automatizável: este espaço está pronto para a resposta real, um respondente por cidade, quando ela chegar."
          footer="As 4 candidatas do case já têm o proxy de diretor (5 subperguntas ancoradas em pesquisa dirigida: tese pública '3º mercado no Sul', expansão histórica sempre contígua). Qualquer outra cidade fica pendente — as subperguntas dependem de fato específico (contiguidade logística, concorrente mapeado) que não dá pra generalizar por fórmula."
          emphasis="quiet"
        >
          <DataTable headers={ADERENCIA_HEADERS} rows={aderenciaRows} quiet />
        </Section>
      ) : null}

      {comErro.length > 0 ? (
        <Panel className="flex items-start gap-3 border-destructive/40 bg-destructive/5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="text-sm text-destructive">
            <p className="font-semibold">
              Não calculado para: {comErro.map((r) => r.nome).join(", ")}
            </p>
            <p className="mt-1 text-destructive/80">{comErro[0]?.erro}</p>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

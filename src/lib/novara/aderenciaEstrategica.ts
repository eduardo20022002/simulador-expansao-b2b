/* ============================================================================
 * Critério 5 — Aderência à estratégia interna.
 *
 * Igual ao 4.2 em natureza: o método real (`Metodologias do Critério 5/
 * algoritmo_aderencia_estrategica.md` §3) é um scorecard qualitativo 1–10
 * respondido pelos diretores responsáveis pela estratégia — sem fonte
 * pública que substitua julgamento humano sobre coerência com o roadmap.
 * Este arquivo é só o espaço reservado (`RESPOSTA_DIRETORIA`, vazio) pra essa
 * resposta chegar.
 *
 * As 4 cidades candidatas do case já têm o proxy de diretor calculado — 5
 * subperguntas ancoradas em fato público da estratégia real da Novara
 * (pesquisa dirigida: tese "3º mercado no Sul", expansão histórica
 * sempre contígua PR→SC→RS→SP). Reaproveitado aqui tal como publicado, sem
 * recalcular. Qualquer outra cidade fica "pendente" — não inventa proxy pra
 * fora dessas 4, porque as subperguntas dependem de fato específico sobre
 * cada cidade (contiguidade logística, concorrente mapeado) que não dá pra
 * generalizar por fórmula.
 * ==========================================================================*/

export const SUBPERGUNTAS = [
  "Sul / roadmap sinalizado",
  "Malha logística contígua",
  'Porte compatível c/ tese "mercado menor"',
  "Cabeça-de-ponte regional",
  "Concorrente-alvo / mercado-vitrine",
] as const;

export interface AderenciaProxy {
  /** As 5 subperguntas, na mesma ordem de SUBPERGUNTAS, cada uma 1–10. */
  subperguntas: [number, number, number, number, number];
}

/** Proxy de diretor das 4 candidatas do case, publicado em algoritmo_aderencia_estrategica.md §4 — chave é o código IBGE do município. */
export const PROXY_CONHECIDO: Record<number, AderenciaProxy> = {
  4314902: { subperguntas: [8, 7, 4, 6, 5] }, // Porto Alegre (RS)
  3509502: { subperguntas: [1, 1, 1, 2, 3] }, // Campinas (SP)
  5208707: { subperguntas: [1, 1, 3, 1, 3] }, // Goiânia (GO)
  3170206: { subperguntas: [9, 10, 9, 9, 7] }, // Uberlândia (MG)
};

export interface RespostaDiretor {
  diretor: string;
  /** Média das 5 subperguntas dele, 1–10. */
  nota: number;
}

/** Espaço reservado pra resposta real da diretoria — vazio até alguém responder o scorecard. Mesma mecânica de `conhecimentoMercado.ts`. */
export const RESPOSTA_DIRETORIA: Record<number, RespostaDiretor[]> = {};

export interface AderenciaResultado {
  origem: "resposta_diretoria" | "proxy_provisorio" | "pendente";
  /** Uma entrada por subpergunta, null se não houver proxy (cidade pendente). */
  subperguntas: (number | null)[];
  nota: number | null;
  respondentes: number;
}

function media(valores: number[]): number {
  return valores.reduce((acc, v) => acc + v, 0) / valores.length;
}

export function aderenciaEstrategica(cidadeId: number): AderenciaResultado {
  const respostas = RESPOSTA_DIRETORIA[cidadeId];
  if (respostas && respostas.length > 0) {
    return {
      origem: "resposta_diretoria",
      subperguntas: SUBPERGUNTAS.map(() => null),
      nota: media(respostas.map((r) => r.nota)),
      respondentes: respostas.length,
    };
  }

  const proxy = PROXY_CONHECIDO[cidadeId];
  if (proxy) {
    return {
      origem: "proxy_provisorio",
      subperguntas: proxy.subperguntas,
      nota: media(proxy.subperguntas),
      respondentes: 0,
    };
  }

  return {
    origem: "pendente",
    subperguntas: SUBPERGUNTAS.map(() => null),
    nota: null,
    respondentes: 0,
  };
}

/* ============================================================================
 * Critério 4.2 — Conhecimento de mercado local.
 *
 * O método real (`Metodologias do Critério 4/algoritmo_conhecimento_mercado.md`
 * §1) é um scorecard qualitativo 1–10 respondido pelos diretores da Novara —
 * "informação que só existe na cabeça de quem já trabalhou ou vendeu na
 * região", nunca automatizável por API. Este arquivo não tenta substituir
 * isso: é só o espaço reservado pra guardar a resposta, uma vez que ela
 * chegar (`RESPOSTA_DIRETORIA`, hoje vazio).
 *
 * Enquanto a diretoria não responde, as 4 cidades candidatas do case já têm
 * o proxy provisório calculado (§3 do mesmo documento: distância à operação
 * mais próxima + mesma região Sul) — reaproveitado aqui tal como
 * publicado, sem recalcular. Qualquer OUTRA cidade selecionada no simulador
 * não tem proxy nem resposta — fica marcada como pendente, de propósito: não
 * inventar um número nem estender o proxy a cidades fora do escopo do case
 * sem decisão explícita de fazer isso.
 * ==========================================================================*/

export interface ConhecimentoMercadoProxy {
  distanciaKm: number;
  mesmaRegiao: boolean;
  nota: number;
}

/**
 * Proxy provisório das 4 candidatas do case, publicado em
 * algoritmo_conhecimento_mercado.md §3 — chave é o código IBGE do município.
 * Substituir (não somar) por `RESPOSTA_DIRETORIA` quando o scorecard real
 * chegar, item por item.
 */
export const PROXY_CONHECIDO: Record<number, ConhecimentoMercadoProxy> = {
  3170206: { distanciaKm: 251, mesmaRegiao: true, nota: 10.0 }, // Uberlândia (MG)
  4314902: { distanciaKm: 665, mesmaRegiao: true, nota: 8.51 }, // Porto Alegre (RS)
  3509502: { distanciaKm: 1639, mesmaRegiao: false, nota: 0.02 }, // Campinas (SP)
  5208707: { distanciaKm: 1642, mesmaRegiao: false, nota: 0.0 }, // Goiânia (GO)
};

export interface RespostaDiretor {
  diretor: string;
  /** Média das 4 subperguntas do scorecard (algoritmo_conhecimento_mercado.md §1), 1–10. */
  nota: number;
}

/**
 * Espaço reservado pra resposta real da diretoria — vazio até alguém
 * responder o scorecard. Chave é o código IBGE do município; valor é a
 * lista de diretores que já responderam pra essa cidade (nota final do
 * subcritério = média das notas de todos os diretores, por cidade).
 */
export const RESPOSTA_DIRETORIA: Record<number, RespostaDiretor[]> = {};

export interface ConhecimentoMercadoResultado {
  origem: "resposta_diretoria" | "proxy_provisorio" | "pendente";
  nota: number | null;
  distanciaKm: number | null;
  mesmaRegiao: boolean | null;
  respondentes: number;
}

/**
 * Resolve o que mostrar pra uma cidade: resposta real da diretoria, se já
 * existir; senão o proxy provisório, só pras 4 candidatas que já o têm;
 * senão "pendente" — nunca inventa um número pra cidade fora dessas duas
 * fontes.
 */
export function conhecimentoMercado(cidadeId: number): ConhecimentoMercadoResultado {
  const respostas = RESPOSTA_DIRETORIA[cidadeId];
  if (respostas && respostas.length > 0) {
    const nota = respostas.reduce((acc, r) => acc + r.nota, 0) / respostas.length;
    return { origem: "resposta_diretoria", nota, distanciaKm: null, mesmaRegiao: null, respondentes: respostas.length };
  }

  const proxy = PROXY_CONHECIDO[cidadeId];
  if (proxy) {
    return {
      origem: "proxy_provisorio",
      nota: proxy.nota,
      distanciaKm: proxy.distanciaKm,
      mesmaRegiao: proxy.mesmaRegiao,
      respondentes: 0,
    };
  }

  return { origem: "pendente", nota: null, distanciaKm: null, mesmaRegiao: null, respondentes: 0 };
}

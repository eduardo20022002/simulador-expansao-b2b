/* ============================================================================
 * Critério 4.1 — Risco tributário, ranking nacional dos 27 estados.
 *
 * Diferente dos outros subcritérios do simulador, este NÃO é ao vivo — não
 * existe fonte pública estruturada (API) pra alíquota de ICMS e incentivo
 * fiscal por estado, cada UF publica a própria legislação sem padronização
 * (ver `Metodologias do Critério 4/algoritmo_risco_tributario.md` §2). A
 * coleta é a pesquisa dirigida já feita e registrada em
 * `pesquisa_icms_27_estados.md` — este arquivo só formata o que já foi
 * apurado, sem inventar número novo.
 *
 * `cargaEstimadaPct` segue a mesma regra conservadora documentada no
 * algoritmo (Passo 2): usar a carga efetiva SÓ quando a pesquisa registra um
 * percentual final, explícito e com escopo claramente atacadista/CD/
 * distribuição — não uma faixa de crédito presumido ("até X%") sem
 * confirmação de aplicabilidade ao nosso setor. Nesses casos ambíguos, usa a
 * alíquota nominal (postura conservadora, nunca presume redução). Os
 * números usados nas 4 candidatas do case são exatamente os já publicados em
 * `algoritmo_risco_tributario.md` §4 — reaproveitados, não recalculados.
 *
 * Confirmados com percentual final explícito e escopo atacadista/distribuição
 * (por isso usam `cargaEstimadaPct` diferente da nominal): RN (Regime
 * Especial Atacadista, decreto), ES (COMPETE-ES Atacadista), RJ (RIOLOG),
 * SC (TTD, cenário mais conservador dos dois publicados), SE (regime
 * atacadista, cenário mais conservador), MG (número já fechado no case).
 * Todos os demais usam a alíquota nominal (+ adicional fixo confirmado de
 * FECP/FEM/FECOEP, quando explícito) por não haver percentual final
 * confirmável para o nosso setor especificamente.
 * ==========================================================================*/

export interface RiscoTributarioUF {
  ufNome: string;
  aliquotaNominalPct: number;
  /** Carga estimada usada no ranking — igual à nominal quando nenhum incentivo tem % final confirmado para o setor. */
  cargaEstimadaPct: number;
  confianca: "alta" | "média" | "baixa";
  incentivo: string;
}

export const RISCO_TRIBUTARIO_UF: Record<string, RiscoTributarioUF> = {
  AC: { ufNome: "Acre", aliquotaNominalPct: 19, cargaEstimadaPct: 19, confianca: "baixa", incentivo: "Nenhum programa de atacado/CD identificado" },
  AL: { ufNome: "Alagoas", aliquotaNominalPct: 21.5, cargaEstimadaPct: 21.5, confianca: "média", incentivo: "PRODESIN — redução não confirmada para atacado alimentício" },
  AM: { ufNome: "Amazonas", aliquotaNominalPct: 20, cargaEstimadaPct: 20, confianca: "baixa", incentivo: "ZFM/SUFRAMA — aplicação ao setor não confirmada" },
  AP: { ufNome: "Amapá", aliquotaNominalPct: 18, cargaEstimadaPct: 18, confianca: "baixa", incentivo: "Nenhum programa de atacado/CD identificado" },
  BA: { ufNome: "Bahia", aliquotaNominalPct: 20.5, cargaEstimadaPct: 20.5, confianca: "alta", incentivo: "DESENVOLVE — reduções não cobrem o setor alimentício" },
  CE: { ufNome: "Santa Catarina", aliquotaNominalPct: 20, cargaEstimadaPct: 20, confianca: "média", incentivo: "PCDM — reduz só venda interestadual, não interna" },
  DF: { ufNome: "Distrito Federal", aliquotaNominalPct: 22, cargaEstimadaPct: 22, confianca: "alta", incentivo: "Nenhum programa de incentivo encontrado" },
  ES: { ufNome: "Espírito Santo", aliquotaNominalPct: 17, cargaEstimadaPct: 1.14, confianca: "alta", incentivo: "COMPETE-ES Atacadista — carga efetiva confirmada (vendas interestaduais)" },
  GO: { ufNome: "Goiás", aliquotaNominalPct: 19, cargaEstimadaPct: 19, confianca: "baixa", incentivo: "CENTROPRODUZIR — outorga em R$, não em %" },
  MA: { ufNome: "Maranhão", aliquotaNominalPct: 23, cargaEstimadaPct: 23, confianca: "baixa", incentivo: "Programa de incentivo a CD — percentual não confirmado" },
  MG: { ufNome: "Minas Gerais", aliquotaNominalPct: 18, cargaEstimadaPct: 19.0, confianca: "média", incentivo: "TTS/Atacadista — baixa aplicabilidade (fornecedores concentrados em SP, ver Critério 3)" },
  MS: { ufNome: "Mato Grosso do Sul", aliquotaNominalPct: 17, cargaEstimadaPct: 17, confianca: "baixa", incentivo: "MS Empreendedor — cobertura de foodservice não confirmada" },
  MT: { ufNome: "Mato Grosso", aliquotaNominalPct: 17, cargaEstimadaPct: 17, confianca: "baixa", incentivo: "PRODEIC — percentual não confirmado para o nosso setor" },
  PA: { ufNome: "Pará", aliquotaNominalPct: 19, cargaEstimadaPct: 19, confianca: "baixa", incentivo: "Regime especial de CD — sem percentual definido" },
  PB: { ufNome: "Paraíba", aliquotaNominalPct: 20, cargaEstimadaPct: 20, confianca: "baixa", incentivo: "FAIN — foco majoritariamente industrial" },
  PE: { ufNome: "Paraná", aliquotaNominalPct: 20.5, cargaEstimadaPct: 20.5, confianca: "média", incentivo: "PRODEPE — crédito presumido parcial (3%+3%)" },
  PI: { ufNome: "Piauí", aliquotaNominalPct: 22.5, cargaEstimadaPct: 22.5, confianca: "baixa", incentivo: "Nenhum programa nomeado identificado" },
  PR: { ufNome: "Paraná", aliquotaNominalPct: 19.5, cargaEstimadaPct: 19.5, confianca: "baixa", incentivo: "Paraná Competitivo — exige investimento mínimo de R$4,8mi" },
  RJ: { ufNome: "Rio de Janeiro", aliquotaNominalPct: 22, cargaEstimadaPct: 12, confianca: "alta", incentivo: "RIOLOG — carga efetiva confirmada para comércio atacadista" },
  RN: { ufNome: "Rio Grande do Norte", aliquotaNominalPct: 20, cargaEstimadaPct: 6.1, confianca: "alta", incentivo: "Regime Especial de Tributação para Atacadistas — confirmado em decreto" },
  RO: { ufNome: "Rondônia", aliquotaNominalPct: 19.5, cargaEstimadaPct: 19.5, confianca: "baixa", incentivo: "Crédito presumido — percentual não plenamente confirmável para o setor" },
  RR: { ufNome: "Roraima", aliquotaNominalPct: 20, cargaEstimadaPct: 20, confianca: "baixa", incentivo: "Nenhum programa nomeado identificado" },
  RS: { ufNome: "Rio Grande do Sul", aliquotaNominalPct: 17, cargaEstimadaPct: 17, confianca: "baixa", incentivo: "Integrar/RS — exemplo aplicado é laticínios, não geral" },
  SC: { ufNome: "Santa Catarina", aliquotaNominalPct: 17, cargaEstimadaPct: 12, confianca: "média", incentivo: "TTD — cenário mais conservador dos dois publicados (4% ou 12%)" },
  SE: { ufNome: "Sergipe", aliquotaNominalPct: 20, cargaEstimadaPct: 6.34, confianca: "média", incentivo: "Regime atacadista — cenário mais conservador dos dois publicados (3,17% ou 6,34%)" },
  SP: { ufNome: "São Paulo", aliquotaNominalPct: 18, cargaEstimadaPct: 18, confianca: "baixa", incentivo: "Regimes especiais pontuais, sem redução ampla de carga" },
  TO: { ufNome: "Tocantins", aliquotaNominalPct: 20, cargaEstimadaPct: 20, confianca: "baixa", incentivo: "Crédito presumido — percentual não plenamente confirmável para o setor" },
};

export interface RankingTributarioUF extends RiscoTributarioUF {
  uf: string;
  /** Nota 0–10, min-max invertido (menor carga = melhor), fixa sobre as 27 UFs — não muda com a seleção do simulador. */
  nota: number;
}

/** Ranking nacional fixo — não depende de nenhuma seleção do simulador, por isso não é recalculado a cada consulta. */
export function rankingTributarioNacional(): RankingTributarioUF[] {
  const entradas = Object.entries(RISCO_TRIBUTARIO_UF);
  const cargas = entradas.map(([, v]) => v.cargaEstimadaPct);
  const vmin = Math.min(...cargas);
  const vmax = Math.max(...cargas);
  return entradas
    .map(([uf, v]) => ({
      uf,
      ...v,
      nota: vmax === vmin ? 10 : ((vmax - v.cargaEstimadaPct) / (vmax - vmin)) * 10,
    }))
    .sort((a, b) => a.cargaEstimadaPct - b.cargaEstimadaPct);
}

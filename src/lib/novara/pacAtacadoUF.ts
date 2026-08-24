/* ============================================================================
 * Receita bruta do comércio por atacado, por UF — IBGE PAC (Pesquisa Anual de
 * Comércio) 2023, Tabela 12 ("Dados gerais das empresas comerciais..."),
 * coluna "Receita bruta de revenda e de comissões sobre venda", linha
 * "Comércio por atacado" de cada Unidade da Federação.
 *
 * Baixado em 23/08/2026 direto do FTP oficial do IBGE — não existe API pra
 * esse dado (só arquivo, publicado ~1x/ano), então diferente de CEMPRE/SIDRA
 * ele NÃO é buscado ao vivo a cada cálculo. É a mesma limitação documentada
 * em `algoritmo_tam_sam_som.md` Módulo A: "baixar a Tabela 12 do ano mais
 * recente" é uma ação de setup, não uma chamada por requisição.
 *
 * Fonte: https://ftp.ibge.gov.br/Comercio_e_Servicos/Pesquisa_Anual_de_Comercio/2023/xlsx/tabelas_2023_xlsx.zip
 * (arquivo `XLS/Tabela 12.xlsx`, aba por região, ano de referência 2023).
 * Reprocessar este arquivo quando o IBGE publicar a PAC de um ano mais novo.
 *
 * Os 4 valores de BA/MG/DF/RN batem exatamente com os já usados em
 * `metodologia_analise.md` seção 1.1 (rodado manualmente por lá em
 * 22/08/2026) — confirma que a extração aqui é a mesma fonte primária.
 * ==========================================================================*/

/** Código numérico da UF no IBGE (nível N3), usado nas chamadas de CEMPRE/SIDRA. */
export const UF_CODIGO: Record<string, number> = {
  RO: 11,
  AC: 12,
  AM: 13,
  RR: 14,
  PA: 15,
  AP: 16,
  TO: 17,
  MA: 21,
  PI: 22,
  CE: 23,
  RN: 24,
  PB: 25,
  PE: 26,
  AL: 27,
  SE: 28,
  BA: 29,
  MG: 31,
  ES: 32,
  RJ: 33,
  SP: 35,
  PR: 41,
  SC: 42,
  RS: 43,
  MS: 50,
  MT: 51,
  GO: 52,
  DF: 53,
};

export interface PacAtacadoUF {
  ufNome: string;
  /** Receita bruta de revenda e comissões sobre venda, "Comércio por atacado", em R$ (já convertido de mil R$). */
  receitaAtacadoR$: number;
}

/** PAC 2023, Tabela 12 — receita do comércio por atacado, por UF (em R$, convertido de "mil R$"). */
export const PAC_ATACADO_UF_2023: Record<string, PacAtacadoUF> = {
  RO: { ufNome: "Rondônia", receitaAtacadoR$: 24_386_455_000 },
  AC: { ufNome: "Acre", receitaAtacadoR$: 3_638_049_000 },
  AM: { ufNome: "Amazonas", receitaAtacadoR$: 30_354_470_000 },
  RR: { ufNome: "Roraima", receitaAtacadoR$: 5_960_998_000 },
  PA: { ufNome: "Pará", receitaAtacadoR$: 60_323_721_000 },
  AP: { ufNome: "Amapá", receitaAtacadoR$: 5_932_469_000 },
  TO: { ufNome: "Tocantins", receitaAtacadoR$: 30_426_780_000 },
  MA: { ufNome: "Maranhão", receitaAtacadoR$: 78_113_296_000 },
  PI: { ufNome: "Piauí", receitaAtacadoR$: 26_487_994_000 },
  CE: { ufNome: "Santa Catarina", receitaAtacadoR$: 53_708_302_000 },
  RN: { ufNome: "Rio Grande do Norte", receitaAtacadoR$: 25_862_318_000 },
  PB: { ufNome: "Paraíba", receitaAtacadoR$: 32_137_478_000 },
  PE: { ufNome: "Paraná", receitaAtacadoR$: 86_851_753_000 },
  AL: { ufNome: "Alagoas", receitaAtacadoR$: 19_635_172_000 },
  SE: { ufNome: "Sergipe", receitaAtacadoR$: 13_606_266_000 },
  BA: { ufNome: "Bahia", receitaAtacadoR$: 138_582_542_000 },
  MG: { ufNome: "Minas Gerais", receitaAtacadoR$: 370_629_194_000 },
  ES: { ufNome: "Espírito Santo", receitaAtacadoR$: 140_600_942_000 },
  RJ: { ufNome: "Rio de Janeiro", receitaAtacadoR$: 189_709_015_000 },
  SP: { ufNome: "São Paulo", receitaAtacadoR$: 1_124_486_125_000 },
  PR: { ufNome: "Paraná", receitaAtacadoR$: 342_335_038_000 },
  SC: { ufNome: "Santa Catarina", receitaAtacadoR$: 262_925_909_000 },
  RS: { ufNome: "Rio Grande do Sul", receitaAtacadoR$: 235_626_970_000 },
  MS: { ufNome: "Mato Grosso do Sul", receitaAtacadoR$: 81_197_848_000 },
  MT: { ufNome: "Mato Grosso", receitaAtacadoR$: 220_356_089_000 },
  GO: { ufNome: "Goiás", receitaAtacadoR$: 157_606_560_000 },
  DF: { ufNome: "Distrito Federal", receitaAtacadoR$: 50_744_438_000 },
};

/* ============================================================================
 * As 27 capitais estaduais (código IBGE do município), geradas em 23/08/2026
 * a partir do IBGE Localidades. Usadas na ARMADILHA #5 do algoritmo do
 * entorno: um município que caia dentro do raio mas seja, ele mesmo, outra
 * capital de estado inteira, é excluído da soma — é outra decisão de
 * expansão completa, não "cidade satélite de graça" (ex.: uma capital
 * vizinha caindo dentro do raio de outra candidata).
 * ==========================================================================*/

export const CAPITAIS_ESTADUAIS: Set<number> = new Set([
  1200401, // Rio Branco (AC)
  2704302, // Maceió (AL)
  1302603, // Manaus (AM)
  1600303, // Macapá (AP)
  2927408, // Salvador (BA)
  2304400, // Fortaleza (CE)
  5300108, // Brasília (DF)
  3205309, // Vitória (ES)
  5208707, // Goiânia (GO)
  2111300, // São Luís (MA)
  3106200, // Belo Horizonte (MG)
  5002704, // Campo Grande (MS)
  5103403, // Cuiabá (MT)
  1501402, // Belém (PA)
  2507507, // João Pessoa (PB)
  2611606, // Recife (PE)
  2211001, // Teresina (PI)
  4106902, // Curitiba (PR)
  3304557, // Rio de Janeiro (RJ)
  2408102, // Natal (RN)
  1100205, // Porto Velho (RO)
  1400100, // Boa Vista (RR)
  4314902, // Porto Alegre (RS)
  4205407, // Florianópolis (SC)
  2800308, // Aracaju (SE)
  3550308, // São Paulo (SP)
  1721000, // Palmas (TO)
]);

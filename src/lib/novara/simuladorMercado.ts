/* ============================================================================
 * Simulador de mercado — versão ao vivo, para QUALQUER município do Brasil,
 * dos Módulos A (TAM), C (SAM da sede), D (SOM) e E (entorno por raio
 * empírico) documentados em `Metodologias do Critério 1/algoritmo_tam_sam_som.md`.
 * Roda no servidor (createServerFn) porque consulta o IBGE CEMPRE/SIDRA e o
 * IBGE Malhas em tempo real — as mesmas 11 CNAEs-alvo e o mesmo ticket médio
 * anual calibrado sobre a base interna da Novara usados no relatório estático
 * das 4 cidades candidatas (`fontesExternas.ts`).
 *
 * TAM (Módulo A): a contagem de atacadistas (cidade e UF, CNAE 117376) vem
 * do CEMPRE/SIDRA ao vivo, a cada cálculo; a receita do comércio atacadista
 * por UF vem da Tabela 12 da PAC — um arquivo publicado ~1x/ano pelo IBGE,
 * sem API — e por isso é uma constante local (`pacAtacadoUF.ts`, as 27 UFs,
 * extraída da mesma fonte primária usada no relatório estático), não uma
 * chamada de rede por requisição. Isso não é um atalho: é o próprio Módulo A
 * descrito no algoritmo ("baixar a Tabela 12 do ano mais recente" é passo de
 * setup, não uma chamada por cidade).
 *
 * Entorno (Módulo E): centróide de polígono via IBGE Malhas (fórmula
 * shoelace, porta direta do Python documentado), distância haversine até
 * todo município da UF da cidade + vizinha direta + vizinha-de-vizinha (2
 * saltos — o suficiente pra cobrir 312km mesmo a partir de UF pequena, ver
 * `geoEntorno.ts`), filtro de raio (312km — a mesma média dos 2 raios reais
 * dos CDs da Novara usada na seção 1.3.1) e exclusão de qualquer capital
 * estadual que caia dentro do raio (ARMADILHA #5 — não é "cidade satélite de
 * graça", é outra decisão de expansão inteira).
 *
 * Validado ao vivo contra a seção 1.3.1 do relatório estático: Uberlândia
 * bate exatamente (município e SAM entorno idênticos); Porto Alegre e
 * Campinas acham MAIS município que o relatório estático — não é erro, é o
 * "pode haver alguma perda residual em bordas de estado não carregado" que a
 * própria seção 1.3.1 já registrava pra essas duas (lá só buscou a própria
 * UF); Goiânia fica perto mas não idêntico, gap não totalmente investigado.
 *
 * Crescimento (Módulo B/1.2) e nota 0–10 (Módulo F): seguem
 * `algoritmo_crescimento.md` e a seção 10 de `algoritmo_tam_sam_som.md`.
 * Crescimento é sempre cidade-sede, nunca entorno (a "Armadilha do Raio
 * Fixo" documentada lá mostra que crescimento de entorno mistura o interior
 * com outras capitais engolidas pelo raio). A nota final do Critério 1
 * replica exatamente `fontesExternas.ts` (CRITERIO1_ROWS, calculado à mão
 * para as 4 candidatas): min-max relativo ao lote selecionado, 1.3 usando
 * SAM médio por município (não SAM total) para corrigir o viés de
 * densidade administrativa (MG tem 853 municípios contra 417 da BA), pesos
 * 0,50/0,25/0,25. Como é min-max, precisa de pelo menos 2 cidades no lote
 * para gerar nota — com 1 só, os campos de nota ficam null.
 *
 * Critério 2 — Operação (2.1 ticket provável, 2.4 fricção logística),
 * seguindo `Metodologias do Critério 2/algoritmo_ticket_provavel.md` e
 * `algoritmo_friccao_logistica.md`:
 *
 * 2.1 — Índice de porte relativo por massa salarial. `porte_médio_UF` =
 * massa salarial anual (CEMPRE var. 662) ÷ nº de empresas (var. 2585) das
 * mesmas 11 CNAEs-alvo, em nível de UF inteira (N3) — nunca raio, depois que
 * a seção 6 do algoritmo achou que misturar escala (UF vs. raio de 312km)
 * inflava artificialmente o erro de validação. `ticket_estimado = K ×
 * porte_médio_UF`, com K calibrado uma vez sobre a praça-sede (ticket real
 * ÷ porte médio da UF-sede) — constante, não recalculada por cidade.
 *
 * 2.4 — Fricção logística: distância-linha-tronco (haversine ponderada pelo
 * nº de empresas-alvo de cada município do entorno até a sede) e dispersão
 * espacial (desvio padrão espacial em torno do centro de gravidade
 * ponderado). Ambas incluem a própria sede como um ponto (distância 0),
 * porque uma sede que concentra quase toda a massa de empresas do raio deve
 * puxar a média pra perto de zero — é a leitura literal do documento
 * ("se a capital possui quase 100% das empresas, a distância será próxima
 * de zero"). O peso é o nº de empresas-alvo 2024 (mesmo Módulo B, reaproveitado
 * também para o entorno inteiro, não só a sede). nota 2.4 = média de duas
 * notas min-max invertidas ("menor = melhor"), uma pra distância e outra pra
 * dispersão — fórmula conferida à mão contra as 4 candidatas do relatório
 * estático (bate exato: Goiânia 10,00, Porto Alegre 8,60, Campinas 4,10, Uberlândia 0,00).
 *
 * 4.4 — Concorrência, camada física (`Metodologias do Critério 4/
 * algoritmo_concorrencia.md` §2). Reaproveita dado que já está sendo buscado
 * pro Módulo A (TAM): `concorrentesFisicos` é a mesma contagem de
 * atacadistas por cidade (CNAE 117376) usada no rateio do TAM — nenhuma
 * consulta nova. `mercadoPorConcorrente = SAM_sede ÷ concorrentesFisicos`,
 * nota min-max direto (maior = mais espaço por concorrente = melhor). A
 * camada digital (pesquisa dirigida de concorrentes B2B nacionais) fica de
 * fora — não automatizável, ver §3 do mesmo documento.
 * ==========================================================================*/

import { createServerFn } from "@tanstack/react-start";

import { CAPITAIS_ESTADUAIS } from "./capitaisEstaduais";
import {
  RAIO_KM_PADRAO,
  buscarCentroidesDaUF,
  acharEntornoNoRaio,
  haversineKm,
  ufsParaEntorno,
  type MunicipioGeo,
} from "./geoEntorno";
import { PAC_ATACADO_UF_2023, UF_CODIGO } from "./pacAtacadoUF";

/** As 11 CNAEs-alvo (tabela 9418, classificação 12762), sem 86.10-1 Hospitalar — ver ARMADILHA #1 do algoritmo. */
const TICKET_MEDIO_ANUAL_POR_CNAE: Record<string, number> = {
  "117435": 27664.64, // 46.91-5 Distribuidor
  "117440": 10761.18, // 47.11-3 Supermercado
  "117441": 10235.64, // 47.12-1 Mercearia
  "117444": 15416.92, // 47.21-1 Padaria/Doces
  "117445": 22173.73, // 47.22-9 Açougue
  "117546": 92229.61, // 55.10-8 Hotéis
  "117551": 24659.72, // 56.11-2 Restaurantes
  "117552": 46768.54, // 56.12-1 Ambulante
  "117554": 25306.32, // 56.20-1 Catering/Buffet
  "117789": 19338.19, // 85 Educação
  "117855": 33030.26, // 93.12-3 Clubes
};

/** Penetração-âncora usada para o SOM no relatório estático (praça mais madura, ~2 anos de operação — a mais conservadora das âncoras observadas). */
const PENETRACAO_SOM = 0.082;

/** Divisão 46 inteira (comércio por atacado, exceto veículos e motos) — usada só no rateio do TAM, não no SAM. */
const CNAE_ATACADISTA = "117376";

/**
 * Horizonte de projeção do crescimento (1.2) — mesmo ano usado no relatório
 * estático. `algoritmo_crescimento.md` registra que os três horizontes
 * possíveis (2027, 2029, 2030) não foram reconciliados com o prazo real de
 * VPL do case; 2029 é reproduzido aqui só para bater com o número já
 * publicado em `fontesExternas.ts`, não porque a ambiguidade foi resolvida.
 */
const ANO_PROJECAO = 2029;

/** 2022 é o primeiro ano com série consolidada nessa tabela do CEMPRE — 2021 não existe. */
const PERIODO_CRESCIMENTO = "2022|2024";

/**
 * K = ticket_real_da_sede ÷ porte_médio_da_UF-sede — calibrado uma vez sobre
 * a base interna (algoritmo_ticket_provavel.md §6), não recalculado por
 * cidade. Erro residual conhecido: cerca de −11% no teste de validação
 * contra a segunda praça (subestima, direção conservadora) — declarar como
 * teto de confiança do método, não esperar precisão maior que isso.
 */
const K_TICKET = 0.0061475;

const CEMPRE_BASE = "https://servicodados.ibge.gov.br/api/v3/agregados/9418";
const LOTE_MAXIMO = 80; // limite prático do SIDRA — acima disso o servidor derruba a request (ARMADILHA #6)

function toInt(v: string | undefined): number {
  if (v === undefined) return 0;
  if (v === "-" || v === "X" || v === ".." || v === "...") return 0;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function emLotes<T>(items: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamanho) lotes.push(items.slice(i, i + tamanho));
  return lotes;
}

interface SidraSerieResultado {
  classificacoes: [{ categoria: Record<string, string> }];
  series: { localidade: { id: string }; serie: Record<string, string> }[];
}
interface SidraResposta {
  resultados: SidraSerieResultado[];
}

async function consultarCempreLote(codigosMunicipio: number[]): Promise<Map<number, number>> {
  const categorias = Object.keys(TICKET_MEDIO_ANUAL_POR_CNAE).join(",");
  const localidades = codigosMunicipio.join(",");
  const url = `${CEMPRE_BASE}/periodos/2024/variaveis/2585?localidades=N6[${localidades}]&classificacao=12762[${categorias}]`;

  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(
      `CEMPRE/SIDRA respondeu ${resposta.status} para o lote de ${codigosMunicipio.length} município(s)`,
    );
  }
  const corpo = (await resposta.json()) as SidraResposta[];
  const samPorMunicipio = new Map<number, number>();

  for (const resultado of corpo[0]?.resultados ?? []) {
    const catId = Object.keys(resultado.classificacoes[0].categoria)[0];
    const ticket = catId ? TICKET_MEDIO_ANUAL_POR_CNAE[catId] : undefined;
    if (ticket === undefined) continue;
    for (const serie of resultado.series) {
      const codigo = Number(serie.localidade.id);
      const n = toInt(serie.serie["2024"]);
      samPorMunicipio.set(codigo, (samPorMunicipio.get(codigo) ?? 0) + n * ticket);
    }
  }
  return samPorMunicipio;
}

async function consultarCempre(codigosMunicipio: number[]): Promise<Map<number, number>> {
  if (codigosMunicipio.length === 0) return new Map();
  const lotes = emLotes(codigosMunicipio, LOTE_MAXIMO);
  const resultadosPorLote = await Promise.all(lotes.map(consultarCempreLote));
  const total = new Map<number, number>();
  for (const mapa of resultadosPorLote) {
    for (const [codigo, valor] of mapa) total.set(codigo, (total.get(codigo) ?? 0) + valor);
  }
  return total;
}

/** Contagem simples de empresas (sem multiplicar por ticket) — usada no rateio do TAM (Módulo A). */
async function contarPorCategoria(
  codigosLocalidade: number[],
  nivel: "N6" | "N3",
  categoria: string,
): Promise<Map<number, number>> {
  if (codigosLocalidade.length === 0) return new Map();
  const localidades = codigosLocalidade.join(",");
  const url = `${CEMPRE_BASE}/periodos/2024/variaveis/2585?localidades=${nivel}[${localidades}]&classificacao=12762[${categoria}]`;

  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`CEMPRE/SIDRA respondeu ${resposta.status} ao contar a categoria ${categoria}`);
  }
  const corpo = (await resposta.json()) as SidraResposta[];
  const contagem = new Map<number, number>();
  for (const resultado of corpo[0]?.resultados ?? []) {
    for (const serie of resultado.series) {
      contagem.set(Number(serie.localidade.id), toInt(serie.serie["2024"]));
    }
  }
  return contagem;
}

interface SidraVariavelResposta {
  id: number;
  resultados: SidraSerieResultado[];
}

interface Porte {
  empresas: number;
  salariosR$: number;
}

/**
 * 2.1 — porte médio por UF: massa salarial (var. 662, em mil reais) e nº de
 * empresas (var. 2585), mesmas 11 CNAEs-alvo, nível N3 (UF inteira, nunca
 * raio — ver nota de escopo no topo do arquivo). Uma chamada só, todas as UFs
 * do lote junto.
 */
async function consultarPorteUF(codigosUF: number[]): Promise<Map<number, Porte>> {
  if (codigosUF.length === 0) return new Map();
  const categorias = Object.keys(TICKET_MEDIO_ANUAL_POR_CNAE).join(",");
  const localidades = codigosUF.join(",");
  const url = `${CEMPRE_BASE}/periodos/2024/variaveis/2585|662?localidades=N3[${localidades}]&classificacao=12762[${categorias}]`;

  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`CEMPRE/SIDRA respondeu ${resposta.status} para o porte médio por UF`);
  }
  const corpo = (await resposta.json()) as SidraVariavelResposta[];
  const porUF = new Map<number, Porte>();

  for (const bloco of corpo) {
    const isEmpresas = String(bloco.id) === "2585";
    const isSalarios = String(bloco.id) === "662";
    if (!isEmpresas && !isSalarios) continue;
    for (const resultado of bloco.resultados ?? []) {
      for (const serie of resultado.series) {
        const codigo = Number(serie.localidade.id);
        const atual = porUF.get(codigo) ?? { empresas: 0, salariosR$: 0 };
        const v = toInt(serie.serie["2024"]);
        if (isEmpresas) atual.empresas += v;
        else atual.salariosR$ += v * 1000; // vem em mil reais
        porUF.set(codigo, atual);
      }
    }
  }
  return porUF;
}

interface Crescimento {
  emp2022: number;
  emp2024: number;
}

/** Módulo B (1.2) — soma de empresas nas mesmas 11 CNAEs-alvo do SAM, sem Hospitalar, 2022 vs 2024. */
async function consultarCrescimentoLote(codigosMunicipio: number[]): Promise<Map<number, Crescimento>> {
  const categorias = Object.keys(TICKET_MEDIO_ANUAL_POR_CNAE).join(",");
  const localidades = codigosMunicipio.join(",");
  const url = `${CEMPRE_BASE}/periodos/${PERIODO_CRESCIMENTO}/variaveis/2585?localidades=N6[${localidades}]&classificacao=12762[${categorias}]`;

  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(
      `CEMPRE/SIDRA respondeu ${resposta.status} para o crescimento do lote de ${codigosMunicipio.length} município(s)`,
    );
  }
  const corpo = (await resposta.json()) as SidraResposta[];
  const porMunicipio = new Map<number, Crescimento>();

  for (const resultado of corpo[0]?.resultados ?? []) {
    for (const serie of resultado.series) {
      const codigo = Number(serie.localidade.id);
      const atual = porMunicipio.get(codigo) ?? { emp2022: 0, emp2024: 0 };
      atual.emp2022 += toInt(serie.serie["2022"]);
      atual.emp2024 += toInt(serie.serie["2024"]);
      porMunicipio.set(codigo, atual);
    }
  }
  return porMunicipio;
}

async function consultarCrescimento(codigosMunicipio: number[]): Promise<Map<number, Crescimento>> {
  if (codigosMunicipio.length === 0) return new Map();
  const lotes = emLotes(codigosMunicipio, LOTE_MAXIMO);
  const resultadosPorLote = await Promise.all(lotes.map(consultarCrescimentoLote));
  const total = new Map<number, Crescimento>();
  for (const mapa of resultadosPorLote) {
    for (const [codigo, valor] of mapa) {
      const atual = total.get(codigo) ?? { emp2022: 0, emp2024: 0 };
      total.set(codigo, { emp2022: atual.emp2022 + valor.emp2022, emp2024: atual.emp2024 + valor.emp2024 });
    }
  }
  return total;
}

/**
 * Módulo F — nota 0–10 por min-max relativo ao lote selecionado ("maior =
 * melhor"). Precisa de pelo menos 2 valores reais pra fazer sentido; com
 * menos, ou todos empatados, retorna null (não 0 nem 10 — isso mascararia a
 * amostra insuficiente como se fosse um resultado real).
 */
function minmaxNota(valores: (number | null)[], maiorMelhor = true): (number | null)[] {
  const validos = valores.filter((v): v is number => v !== null);
  if (validos.length < 2) return valores.map(() => null);
  const vmin = Math.min(...validos);
  const vmax = Math.max(...validos);
  if (vmax === vmin) return valores.map(() => null);
  return valores.map((v) => {
    if (v === null) return null;
    const fracao = maiorMelhor ? (v - vmin) / (vmax - vmin) : (vmax - v) / (vmax - vmin);
    return fracao * 10;
  });
}

interface PontoPonderado {
  distanciaKm: number;
  lat: number;
  lon: number;
  peso: number;
}

/** 2.4, passo 1 — distância-linha-tronco: média das distâncias à sede, ponderada pelo nº de empresas-alvo. */
function distanciaTroncalPonderada(pontos: PontoPonderado[]): number {
  const pesoTotal = pontos.reduce((acc, p) => acc + p.peso, 0);
  if (pesoTotal <= 0) return 0;
  return pontos.reduce((acc, p) => acc + p.distanciaKm * p.peso, 0) / pesoTotal;
}

/** 2.4, passo 2 — desvio padrão espacial em torno do centro de gravidade ponderado pelo nº de empresas-alvo. */
function dispersaoEspacial(pontos: PontoPonderado[]): number {
  const pesoTotal = pontos.reduce((acc, p) => acc + p.peso, 0);
  if (pesoTotal <= 0) return 0;
  const latCG = pontos.reduce((acc, p) => acc + p.lat * p.peso, 0) / pesoTotal;
  const lonCG = pontos.reduce((acc, p) => acc + p.lon * p.peso, 0) / pesoTotal;
  const variancia =
    pontos.reduce((acc, p) => {
      const d = haversineKm(latCG, lonCG, p.lat, p.lon);
      return acc + d * d * p.peso;
    }, 0) / pesoTotal;
  return Math.sqrt(variancia);
}

export interface CidadeSelecionada {
  id: number;
  nome: string;
  uf: string;
}

export interface ResultadoMercadoCidade {
  id: number;
  nome: string;
  uf: string;
  raioKm: number;
  samSede: number;
  samEntorno: number;
  samTotal: number;
  nMunicipiosEntorno: number;
  /** SAM entorno ÷ nº de municípios do entorno — métrica final de 1.3 (fontesExternas.ts), corrige o viés de densidade administrativa. Null sem município no entorno. */
  samMedioPorMunicipio: number | null;
  som: number;
  /** null quando a UF não tem dado de PAC 2023 catalogado, ou a consulta ao CEMPRE de atacadistas falhou. */
  tam: number | null;
  participacaoTAM: number | null;
  /** Módulo B/1.2 — soma das mesmas CNAEs-alvo do SAM, sem Hospitalar. Null se a consulta de crescimento falhou. */
  emp2022: number | null;
  emp2024: number | null;
  cagr: number | null;
  /** Projeção para ANO_PROJECAO (2029) — ver ressalva de horizonte no comentário da constante. */
  projecao: number | null;
  /** Notas 0–10, min-max relativas ao lote selecionado (Módulo F). Null com menos de 2 cidades válidas ou empate total. */
  nota11: number | null;
  nota12: number | null;
  nota13: number | null;
  /** 0,50×nota11 + 0,25×nota12 + 0,25×nota13 — mesma fórmula de CRITERIO1_ROWS. Null se qualquer nota componente faltar. */
  notaCriterio1: number | null;
  /** 2.1 — massa salarial anual ÷ nº de empresas-alvo, nível UF (N3). Null se a consulta falhou. */
  porteMedioUF: number | null;
  /** 2.1 — K × porteMedioUF. */
  ticketEstimado: number | null;
  /** 2.4 — distância haversine ponderada por nº de empresas-alvo, sede incluída (distância 0). */
  distanciaTroncalKm: number | null;
  /** 2.4 — desvio padrão espacial em torno do centro de gravidade ponderado. */
  dispersaoKm: number | null;
  nota21: number | null;
  nota24: number | null;
  /** média(nota21, nota24) — mesma fórmula de CRITERIO2_ROWS. */
  notaCriterio2: number | null;
  /** 4.4, camada física — nº de atacadistas (CNAE 117376) na cidade, mesmo dado do rateio do TAM. */
  concorrentesFisicos: number | null;
  /** 4.4 — SAM sede ÷ concorrentesFisicos. Null sem concorrente contado. */
  mercadoPorConcorrente: number | null;
  /** 4.4 — nota min-max direto (maior mercado/concorrente = melhor). */
  nota44Fisica: number | null;
  erro?: string;
}

export const calcularMercado = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as { cidades: CidadeSelecionada[] })
  .handler(async ({ data }): Promise<ResultadoMercadoCidade[]> => {
    const cidades = data.cidades.slice(0, 5);
    if (cidades.length === 0) return [];

    // Módulo E — busca a malha de cada UF envolvida (deduplicada) e o centróide de todo
    // município nela, uma vez só por UF mesmo que várias cidades selecionadas a compartilhem.
    const ufsUnicas = [...new Set(cidades.flatMap((c) => ufsParaEntorno(c.uf)))];
    const malhasPorUF = new Map<string, MunicipioGeo[] | null>();
    await Promise.all(
      ufsUnicas.map(async (uf) => {
        try {
          malhasPorUF.set(uf, await buscarCentroidesDaUF(uf));
        } catch {
          malhasPorUF.set(uf, null);
        }
      }),
    );

    const entornoPorCidade = cidades.map((cidade) => {
      const ufs = ufsParaEntorno(cidade.uf);
      const candidatos = ufs.flatMap((uf) => malhasPorUF.get(uf) ?? []);
      const centroideSede = candidatos.find((c) => c.id === cidade.id);
      if (!centroideSede) return null;
      return acharEntornoNoRaio(centroideSede, candidatos, RAIO_KM_PADRAO, CAPITAIS_ESTADUAIS);
    });

    const todosCodigos = new Set<number>();
    cidades.forEach((c) => todosCodigos.add(c.id));
    entornoPorCidade.forEach((lista) => lista?.forEach((m) => todosCodigos.add(m.id)));

    const ufCodigosUnicos = [
      ...new Set(cidades.map((c) => UF_CODIGO[c.uf]).filter((v): v is number => v !== undefined)),
    ];

    // SAM/SOM (Módulo C/D), TAM (Módulo A), Crescimento (Módulo B/1.2) e porte médio
    // por UF (2.1) são independentes — uma falha num não deve derrubar os outros, então
    // rodam em paralelo e degradam separadamente. Crescimento roda sobre TODOS_OS_CÓDIGOS
    // (sede + entorno), não só a sede: o emp2024 de cada município do entorno é reaproveitado
    // como peso da fricção logística (2.4), evitando uma segunda bateria de chamadas ao CEMPRE.
    const [samResultado, tamResultado, crescimentoResultado, porteResultado] = await Promise.allSettled([
      consultarCempre([...todosCodigos]),
      Promise.all([
        contarPorCategoria(
          cidades.map((c) => c.id),
          "N6",
          CNAE_ATACADISTA,
        ),
        contarPorCategoria(ufCodigosUnicos, "N3", CNAE_ATACADISTA),
      ]),
      consultarCrescimento([...todosCodigos]),
      consultarPorteUF(ufCodigosUnicos),
    ]);

    if (samResultado.status === "rejected") {
      const erro = samResultado.reason;
      const mensagem =
        erro instanceof Error ? erro.message : "Falha ao consultar o IBGE CEMPRE/SIDRA";
      return cidades.map((c) => ({
        id: c.id,
        nome: c.nome,
        uf: c.uf,
        raioKm: RAIO_KM_PADRAO,
        samSede: 0,
        samEntorno: 0,
        samTotal: 0,
        nMunicipiosEntorno: 0,
        samMedioPorMunicipio: null,
        som: 0,
        tam: null,
        participacaoTAM: null,
        emp2022: null,
        emp2024: null,
        cagr: null,
        projecao: null,
        nota11: null,
        nota12: null,
        nota13: null,
        notaCriterio1: null,
        porteMedioUF: null,
        ticketEstimado: null,
        distanciaTroncalKm: null,
        dispersaoKm: null,
        nota21: null,
        nota24: null,
        notaCriterio2: null,
        concorrentesFisicos: null,
        mercadoPorConcorrente: null,
        nota44Fisica: null,
        erro: mensagem,
      }));
    }

    const samPorMunicipio = samResultado.value;
    const mapaVazio: Map<number, number> = new Map();
    const [mapaAtacadistasCidade, mapaAtacadistasUF] =
      tamResultado.status === "fulfilled" ? tamResultado.value : [mapaVazio, mapaVazio];
    const crescimentoPorMunicipio =
      crescimentoResultado.status === "fulfilled" ? crescimentoResultado.value : new Map<number, Crescimento>();
    const porteMedioPorUF =
      porteResultado.status === "fulfilled" ? porteResultado.value : new Map<number, Porte>();

    // Lookup de lat/lon por município, pra dispersão espacial (2.4) — junta todas as malhas
    // já buscadas pro entorno (Módulo E), sem nova chamada de rede.
    const centroidesPorId = new Map<number, MunicipioGeo>();
    for (const lista of malhasPorUF.values()) {
      lista?.forEach((m) => centroidesPorId.set(m.id, m));
    }

    const brutos = cidades.map((cidade, i) => {
      const samSede = samPorMunicipio.get(cidade.id) ?? 0;
      const entorno = entornoPorCidade[i];
      const samEntorno = (entorno ?? []).reduce(
        (acc, m) => acc + (samPorMunicipio.get(m.id) ?? 0),
        0,
      );
      const nMunicipiosEntorno = entorno?.length ?? 0;
      const samMedioPorMunicipio = nMunicipiosEntorno > 0 ? samEntorno / nMunicipiosEntorno : null;

      const ufCodigo = UF_CODIGO[cidade.uf];
      const pac = PAC_ATACADO_UF_2023[cidade.uf];
      let tam: number | null = null;
      let participacaoTAM: number | null = null;
      if (tamResultado.status === "fulfilled" && ufCodigo !== undefined && pac) {
        const nAtacadistasCidade = mapaAtacadistasCidade.get(cidade.id) ?? 0;
        const nAtacadistasUF = mapaAtacadistasUF.get(ufCodigo) ?? 0;
        if (nAtacadistasUF > 0) {
          participacaoTAM = nAtacadistasCidade / nAtacadistasUF;
          tam = pac.receitaAtacadoR$ * participacaoTAM;
        }
      }

      const crescimento = crescimentoPorMunicipio.get(cidade.id);
      let cagr: number | null = null;
      let projecao: number | null = null;
      if (crescimento && crescimento.emp2022 > 0) {
        cagr = Math.pow(crescimento.emp2024 / crescimento.emp2022, 1 / 2) - 1;
        projecao = Math.round(crescimento.emp2024 * Math.pow(1 + cagr, ANO_PROJECAO - 2024));
      }

      // 2.1 — ticket estimado = K × porte médio (massa salarial ÷ nº empresas), nível UF.
      const porte = ufCodigo !== undefined ? porteMedioPorUF.get(ufCodigo) : undefined;
      const porteMedioUF = porte && porte.empresas > 0 ? porte.salariosR$ / porte.empresas : null;
      const ticketEstimado = porteMedioUF !== null ? K_TICKET * porteMedioUF : null;

      // 2.4 — fricção logística: sede (distância 0) + entorno, peso = nº de empresas-alvo 2024.
      const sedeGeo = centroidesPorId.get(cidade.id);
      const pesoSede = crescimentoPorMunicipio.get(cidade.id)?.emp2024 ?? 0;
      const pontos: PontoPonderado[] = [];
      if (sedeGeo) {
        pontos.push({ distanciaKm: 0, lat: sedeGeo.lat, lon: sedeGeo.lon, peso: pesoSede });
      }
      (entorno ?? []).forEach((m) => {
        const geo = centroidesPorId.get(m.id);
        if (!geo) return;
        pontos.push({
          distanciaKm: m.distanciaKm,
          lat: geo.lat,
          lon: geo.lon,
          peso: crescimentoPorMunicipio.get(m.id)?.emp2024 ?? 0,
        });
      });
      const distanciaTroncalKm = pontos.length > 0 ? distanciaTroncalPonderada(pontos) : null;
      const dispersaoKm = pontos.length > 0 ? dispersaoEspacial(pontos) : null;

      // 4.4, camada física — mesma contagem de atacadistas (CNAE 117376) já buscada pro TAM.
      const concorrentesFisicos =
        tamResultado.status === "fulfilled" ? (mapaAtacadistasCidade.get(cidade.id) ?? 0) : null;
      const mercadoPorConcorrente =
        concorrentesFisicos !== null && concorrentesFisicos > 0 ? samSede / concorrentesFisicos : null;

      return {
        id: cidade.id,
        nome: cidade.nome,
        uf: cidade.uf,
        raioKm: RAIO_KM_PADRAO,
        samSede,
        samEntorno,
        samTotal: samSede + samEntorno,
        nMunicipiosEntorno,
        samMedioPorMunicipio,
        som: samSede * PENETRACAO_SOM,
        tam,
        participacaoTAM,
        emp2022: crescimento?.emp2022 ?? null,
        emp2024: crescimento?.emp2024 ?? null,
        cagr,
        projecao,
        porteMedioUF,
        ticketEstimado,
        distanciaTroncalKm,
        dispersaoKm,
        concorrentesFisicos,
        mercadoPorConcorrente,
      };
    });

    // Módulo F — nota 0-10 por min-max, calculada sobre o lote inteiro selecionado
    // (nunca cidade a cidade isolada — min-max exige o conjunto).
    const notas11 = minmaxNota(brutos.map((r) => r.samSede));
    const notas12 = minmaxNota(brutos.map((r) => r.cagr));
    const notas13 = minmaxNota(brutos.map((r) => r.samMedioPorMunicipio));
    const notas21 = minmaxNota(brutos.map((r) => r.ticketEstimado));
    // 2.4 é "menor = melhor" — distância e dispersão pequenas indicam operação mais barata.
    const notasDistancia = minmaxNota(brutos.map((r) => r.distanciaTroncalKm), false);
    const notasDispersao = minmaxNota(brutos.map((r) => r.dispersaoKm), false);
    const notas44 = minmaxNota(brutos.map((r) => r.mercadoPorConcorrente));

    return brutos.map((r, i) => {
      const nota11 = notas11[i] ?? null;
      const nota12 = notas12[i] ?? null;
      const nota13 = notas13[i] ?? null;
      const notaCriterio1 =
        nota11 !== null && nota12 !== null && nota13 !== null
          ? 0.5 * nota11 + 0.25 * nota12 + 0.25 * nota13
          : null;

      const nota21 = notas21[i] ?? null;
      const notaDist = notasDistancia[i] ?? null;
      const notaDisp = notasDispersao[i] ?? null;
      const nota24 = notaDist !== null && notaDisp !== null ? (notaDist + notaDisp) / 2 : null;
      const notaCriterio2 = nota21 !== null && nota24 !== null ? (nota21 + nota24) / 2 : null;

      const nota44Fisica = notas44[i] ?? null;

      return {
        ...r,
        nota11,
        nota12,
        nota13,
        notaCriterio1,
        nota21,
        nota24,
        notaCriterio2,
        nota44Fisica,
      };
    });
  });

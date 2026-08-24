/* ============================================================================
 * Critério 3 — Abastecimento do CD, versão ao vivo para QUALQUER cidade do
 * Brasil, seguindo `Metodologias do Critério 3/algoritmo_abastecimento.md` e
 * o fechamento registrado em `metodologia_analise.md` §3 (23/08/2026).
 *
 * Score_abastecimento_cidade = Σ_categoria [ peso%_categoria ×
 *   distância_média_ponderada_categoria ], onde peso%_categoria vem do mix
 * real da base interna (todas as 48 categorias nomeadas, "Não informado"
 * fora do mapeamento) e distância_média_ponderada_categoria é a distância
 * haversine da cidade-sede até a CAPITAL de cada uma das top-5 UFs
 * fornecedoras daquela categoria (nº de empresas-alvo, CEMPRE 2024),
 * ponderada pelo próprio nº de empresas de cada UF no top-5. Nota é
 * min-max invertido (menor km = melhor).
 *
 * Uma chamada só ao CEMPRE cobre as 34 CNAEs-fornecedor × 27 UFs de uma vez
 * (localidades=N3[all]) — o top-5 nacional de cada categoria não depende de
 * qual cidade está selecionada, só é recalculado uma vez por requisição.
 * Cada capital de UF-fornecedora usa `buscarCentroideMunicipio` (1 município
 * só), não `buscarCentroidesDaUF` (estado inteiro) — MG sozinho tem 853
 * municípios, seria caro à toa buscar a malha inteira só pelo centróide da
 * capital.
 * ==========================================================================*/

import { createServerFn } from "@tanstack/react-start";

import { buscarCentroideMunicipio, haversineKm, type MunicipioGeo } from "./geoEntorno";
import { productShares } from "./engine";
import { UF_CODIGO } from "./pacAtacadoUF";

const CEMPRE_BASE = "https://servicodados.ibge.gov.br/api/v3/agregados/9418";

/** Capital de cada UF (código IBGE do município) — mesma lista de `capitaisEstaduais.ts`, indexada por sigla. */
const CAPITAL_POR_UF: Record<string, number> = {
  AC: 1200401,
  AL: 2704302,
  AM: 1302603,
  AP: 1600303,
  BA: 2927408,
  CE: 2304400,
  DF: 5300108,
  ES: 3205309,
  GO: 5208707,
  MA: 2111300,
  MG: 3106200,
  MS: 5002704,
  MT: 5103403,
  PA: 1501402,
  PB: 2507507,
  PE: 2611606,
  PI: 2211001,
  PR: 4106902,
  RJ: 3304557,
  RN: 2408102,
  RO: 1100205,
  RR: 1400100,
  RS: 4314902,
  SC: 4205407,
  SE: 2800308,
  SP: 3550308,
  TO: 1721000,
};

const UF_SIGLA_POR_CODIGO: Record<number, string> = Object.fromEntries(
  Object.entries(UF_CODIGO).map(([sigla, codigo]) => [codigo, sigla]),
);

/**
 * 48 `product_category` → CNAE(s) de fornecedor, validado contra a lista de
 * categorias da base em 23/08/2026 (algoritmo_abastecimento.md §3). "Não
 * informado" (49ª categoria de `PRODUCT_CATEGORIES`) fica de fora de
 * propósito — não tem CNAE de fornecedor identificável.
 */
const MAPEAMENTO_PRODUTO_CNAE: Record<string, string[]> = {
  Arroz: ["46320", "10619"],
  Aves: ["46346", "10121"],
  "Azeite e Composto": ["46397"],
  "Açúcares e Sais": ["46397", "10724"],
  "Batata e Vegetais Congelados": ["46338", "10996"],
  Café: ["46214", "10813"],
  "Carnes - Britânicas": ["46346"],
  "Carnes - Grill": ["46346"],
  "Carnes - Importadas": ["46346"],
  "Carnes - Nobres": ["46346"],
  "Carnes - Populares": ["46346"],
  "Cervejas e Vinhos": ["46354", "11135", "11127"],
  Charque: ["46346", "10139"],
  "Chocolates e Coberturas": ["46397", "10937"],
  Condensado: ["46311", "10520"],
  "Confeitos e Decoração": ["46397", "10937"],
  "Conservas e Enlatados": ["46338", "10317", "10325"],
  "Creme de Leite": ["46311", "10520"],
  "Derivados de Leite": ["46311", "10520"],
  Destilados: ["46354", "11119"],
  "Doces e Recheios": ["46397", "10937"],
  "Farinha de Trigo": ["46320", "10627"],
  Farinhas: ["46320", "10627"],
  "Feijão e Grãos": ["46320", "46397"],
  "Gordura Vegetal": ["46397", "10431"],
  "Leite UHT": ["46311", "10511"],
  "Leite de Coco e Derivados": ["46397", "10520"],
  "Leite em Pó": ["46311", "10520"],
  Limpeza: ["46494"],
  Manteiga: ["46311", "10520"],
  Margarina: ["46397", "10431"],
  Massas: ["46397", "10945"],
  Miúdos: ["46346", "10121"],
  "Molhos e Atomatados": ["46397", "10953"],
  "Mussarela, Prato e Coalho": ["46311", "10520"],
  Orientais: ["46397"],
  Panko: ["46397", "10911"],
  Pescados: ["46346", "10201"],
  "Queijos finos": ["46311", "10520"],
  "Refrigerantes e Gaseificados": ["46354", "11224"],
  Snacks: ["46397", "10996"],
  "Sucos e Xaropes": ["46354", "10333"],
  "Suínos - Cortes e In Natura": ["46346", "10121"],
  "Suínos - Embutidos e Processados": ["46346", "10139"],
  "Temperos e Caldos": ["46397", "10953"],
  "Utensílios e Papelaria": ["46478", "46494"],
  "Água Mineral": ["46354", "11216"],
  "Óleo de Soja": ["46397", "10414", "10422"],
};

/** Código CNAE pontuado → id interno do SIDRA (tabela 9418, classificação 12762) — já resolvidos, ver algoritmo_abastecimento.md §4. */
const CNAE_PARA_SIDRA_ID: Record<string, number> = {
  "10431": 116925,
  "11216": 116958,
  "46320": 117393,
  "10317": 116919,
  "46397": 117399,
  "10333": 116921,
  "10619": 116931,
  "10813": 116942,
  "10953": 116949,
  "10422": 116924,
  "10414": 116923,
  "46311": 117392,
  "10627": 116932,
  "10724": 116940,
  "46478": 117407,
  "11119": 116954,
  "10937": 116947,
  "46338": 117394,
  "10139": 116915,
  "46214": 117388,
  "10945": 116948,
  "46494": 117408,
  "10520": 116928,
  "10911": 116945,
  "10996": 116951,
  "10325": 116920,
  "46346": 117395,
  "11127": 116955,
  "10201": 116917,
  "10121": 116914,
  "11224": 116959,
  "11135": 116956,
  "46354": 117396,
  "10511": 116927,
};

function toInt(v: string | undefined): number {
  if (v === undefined) return 0;
  if (v === "-" || v === "X" || v === ".." || v === "...") return 0;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

interface SidraSerieResultado {
  classificacoes: [{ categoria: Record<string, string> }];
  series: { localidade: { id: string }; serie: Record<string, string> }[];
}
interface SidraResposta {
  resultados: SidraSerieResultado[];
}

/**
 * Nº de empresas por (id SIDRA de CNAE-fornecedor) × UF, nível nacional
 * (N3[all]), numa chamada só — as 34 CNAEs-fornecedor cobrem todas as 48
 * categorias de produto.
 */
async function consultarEmpresasPorCnaeNacional(): Promise<Map<number, Map<string, number>>> {
  const sidraIds = [...new Set(Object.values(CNAE_PARA_SIDRA_ID))];
  const url = `${CEMPRE_BASE}/periodos/2024/variaveis/2585?localidades=N3[all]&classificacao=12762[${sidraIds.join(",")}]`;

  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`CEMPRE/SIDRA respondeu ${resposta.status} para o ranking nacional de fornecedores`);
  }
  const corpo = (await resposta.json()) as SidraResposta[];
  const porSidraId = new Map<number, Map<string, number>>();

  for (const resultado of corpo[0]?.resultados ?? []) {
    const sidraId = Number(Object.keys(resultado.classificacoes[0].categoria)[0]);
    const porUF = porSidraId.get(sidraId) ?? new Map<string, number>();
    for (const serie of resultado.series) {
      const ufCodigo = Number(serie.localidade.id);
      const sigla = UF_SIGLA_POR_CODIGO[ufCodigo];
      if (!sigla) continue;
      porUF.set(sigla, (porUF.get(sigla) ?? 0) + toInt(serie.serie["2024"]));
    }
    porSidraId.set(sidraId, porUF);
  }
  return porSidraId;
}

export interface CidadeAbastecimento {
  id: number;
  nome: string;
  uf: string;
}

export interface ResultadoAbastecimentoCidade {
  id: number;
  nome: string;
  uf: string;
  /** Score em km — soma ponderada por peso%_categoria da distância média até os polos fornecedores. */
  score: number | null;
  /** Nota 0–10, min-max invertido (menor km = melhor) relativo ao lote selecionado. */
  nota: number | null;
  erro?: string;
}

function minmaxNotaInvertido(valores: (number | null)[]): (number | null)[] {
  const validos = valores.filter((v): v is number => v !== null);
  if (validos.length < 2) return valores.map(() => null);
  const vmin = Math.min(...validos);
  const vmax = Math.max(...validos);
  if (vmax === vmin) return valores.map(() => null);
  return valores.map((v) => (v === null ? null : ((vmax - v) / (vmax - vmin)) * 10));
}

export const calcularAbastecimento = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as { cidades: CidadeAbastecimento[] })
  .handler(async ({ data }): Promise<ResultadoAbastecimentoCidade[]> => {
    const cidades = data.cidades.slice(0, 5);
    if (cidades.length === 0) return [];

    let porSidraId: Map<number, Map<string, number>>;
    try {
      porSidraId = await consultarEmpresasPorCnaeNacional();
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Falha ao consultar o IBGE CEMPRE/SIDRA";
      return cidades.map((c) => ({ id: c.id, nome: c.nome, uf: c.uf, score: null, nota: null, erro: mensagem }));
    }

    // Top-5 UFs por categoria (nº de empresas somado das CNAEs mapeadas). Não depende da
    // cidade selecionada — é um ranking nacional, calculado uma vez por requisição.
    const top5PorCategoria = new Map<string, { uf: string; n: number }[]>();
    const ufsNecessarias = new Set<string>();
    for (const [categoria, cnaes] of Object.entries(MAPEAMENTO_PRODUTO_CNAE)) {
      const sidraIds = [...new Set(cnaes.map((c) => CNAE_PARA_SIDRA_ID[c]).filter((v): v is number => v !== undefined))];
      const totalPorUF = new Map<string, number>();
      for (const sidraId of sidraIds) {
        const porUF = porSidraId.get(sidraId);
        if (!porUF) continue;
        for (const [uf, n] of porUF) totalPorUF.set(uf, (totalPorUF.get(uf) ?? 0) + n);
      }
      const top5 = [...totalPorUF.entries()]
        .map(([uf, n]) => ({ uf, n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 5);
      top5PorCategoria.set(categoria, top5);
      top5.forEach(({ uf }) => ufsNecessarias.add(uf));
    }

    // Centróide da capital de cada UF-fornecedora que aparece em algum top-5 (município só,
    // não a malha do estado inteiro) + centróide de cada cidade selecionada.
    const centroidesPorId = new Map<number, MunicipioGeo>();
    const idsNecessarios = new Set<number>(cidades.map((c) => c.id));
    ufsNecessarias.forEach((uf) => {
      const capital = CAPITAL_POR_UF[uf];
      if (capital !== undefined) idsNecessarios.add(capital);
    });
    await Promise.all(
      [...idsNecessarios].map(async (id) => {
        try {
          centroidesPorId.set(id, await buscarCentroideMunicipio(id));
        } catch {
          // Cidade/capital sem geometria disponível — fica de fora do cálculo que precisar dela.
        }
      }),
    );

    const pesos = productShares();
    const pesoPorCategoria = new Map(pesos.map((p) => [p.label, p.share]));

    const brutos = cidades.map((cidade) => {
      const centroideCidade = centroidesPorId.get(cidade.id);
      if (!centroideCidade) {
        return {
          id: cidade.id,
          nome: cidade.nome,
          uf: cidade.uf,
          score: null as number | null,
          erro: "Sem geometria (IBGE Malhas) para esta cidade.",
        };
      }

      let score = 0;
      for (const [categoria, top5] of top5PorCategoria) {
        if (top5.length === 0) continue;
        const peso = pesoPorCategoria.get(categoria) ?? 0;
        const pesoTotalUFs = top5.reduce((acc, u) => acc + u.n, 0);
        if (pesoTotalUFs <= 0) continue;
        const distanciaMedia = top5.reduce((acc, u) => {
          const capitalId = CAPITAL_POR_UF[u.uf];
          const centroideCapital = capitalId !== undefined ? centroidesPorId.get(capitalId) : undefined;
          if (!centroideCapital) return acc;
          const d = haversineKm(
            centroideCidade.lat,
            centroideCidade.lon,
            centroideCapital.lat,
            centroideCapital.lon,
          );
          return acc + d * u.n;
        }, 0) / pesoTotalUFs;
        score += peso * distanciaMedia;
      }

      return { id: cidade.id, nome: cidade.nome, uf: cidade.uf, score };
    });

    const notas = minmaxNotaInvertido(brutos.map((r) => r.score));
    return brutos.map((r, i) => ({ ...r, nota: notas[i] ?? null }));
  });

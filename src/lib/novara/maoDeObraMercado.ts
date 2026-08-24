/* ============================================================================
 * Critério 4.3 — Disponibilidade de mão de obra, ao vivo para QUALQUER
 * cidade do Brasil, seguindo `Metodologias do Critério 4/algoritmo_mao_de_obra.md`.
 *
 * Fonte: IBGE PNAD Contínua/SIDRA (tabelas 5435, 5444, 4099, 4093), nível de
 * município (N6), período mais recente disponível (`periodos/-1`). RAIS/CAGED
 * por CBO exata ficou indisponível (PDET fora do ar, testado) — substituído
 * por grupamento ocupacional PNAD (classificação 694, categorias 33377
 * "operadores de máquina/instalações" e 33374 "vendedores/serviços"), mais
 * largo que CBO específica, mas é a única fonte que responde de fato.
 *
 * Limitação estrutural, não de implementação: a PNAD Contínua só tem amostra
 * suficiente pra cobrir capitais e grandes cidades — um município pequeno
 * devolve resposta vazia (testado com Amaraji/PE). Cidades sem dado ficam
 * com `erro`, não com zero (zero seria "mercado de trabalho inexistente",
 * o que é falso — é a fonte que não cobre, não o dado real).
 *
 * nota_4.3 = média(score_estoque, score_custo, score_desemprego), cada um
 * min-max relativo ao lote selecionado (score_custo invertido: menor salário
 * = nota melhor; os outros dois diretos: maior = nota melhor).
 * ==========================================================================*/

import { createServerFn } from "@tanstack/react-start";

const PNAD_BASE = "https://servicodados.ibge.gov.br/api/v3/agregados";

/** 33377 = operadores de instalações/máquinas (proxy motorista/armazém); 33374 = vendedores/serviços (proxy comercial). */
const GRUPOS_OCUPACIONAIS = ["33377", "33374"];

function toNum(v: string | undefined): number | null {
  if (v === undefined) return null;
  if (v === "-" || v === "X" || v === ".." || v === "...") return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

interface SidraSerie {
  localidade: { id: string };
  serie: Record<string, string>;
}
interface SidraResultadoBloco {
  classificacoes?: [{ categoria: Record<string, string> }];
  series: SidraSerie[];
}
/** A resposta da SIDRA é [ { id: variável, resultados: [{classificacoes, series}] } ] — um nível a mais que o de CEMPRE/CNAE, confirmado direto contra a API. */
interface SidraVariavelBloco {
  id: string;
  resultados: SidraResultadoBloco[];
}
type SidraRespostaPNAD = SidraVariavelBloco[];

function valorDaSerie(serie: Record<string, string>): number | null {
  const chave = Object.keys(serie)[0];
  return chave ? toNum(serie[chave]) : null;
}

async function consultarPnad(
  tabela: number,
  variavel: number,
  codigosMunicipio: number[],
  classificacao?: string[],
): Promise<SidraRespostaPNAD> {
  const codigos = codigosMunicipio.join(",");
  let url = `${PNAD_BASE}/${tabela}/periodos/-1/variaveis/${variavel}?localidades=N6[${codigos}]`;
  if (classificacao) url += `&classificacao=694[${classificacao.join(",")}]`;

  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`IBGE PNAD Contínua/SIDRA respondeu ${resposta.status} (tabela ${tabela})`);
  }
  return (await resposta.json()) as SidraRespostaPNAD;
}

/** Soma (ou combina) os 2 grupamentos ocupacionais por cidade, a partir da resposta de uma tabela classificada. */
function porCidadePorGrupo(resposta: SidraRespostaPNAD): Map<number, Map<string, number | null>> {
  const porCidade = new Map<number, Map<string, number | null>>();
  for (const variavel of resposta) {
    for (const bloco of variavel.resultados) {
      const grupo =
        bloco.classificacoes && bloco.classificacoes.length > 0
          ? Object.keys(bloco.classificacoes[0].categoria)[0]
          : undefined;
      for (const serie of bloco.series) {
        const codigo = Number(serie.localidade.id);
        const porGrupo = porCidade.get(codigo) ?? new Map<string, number | null>();
        porGrupo.set(grupo ?? "total", valorDaSerie(serie.serie));
        porCidade.set(codigo, porGrupo);
      }
    }
  }
  return porCidade;
}

function porCidadeSimples(resposta: SidraRespostaPNAD): Map<number, number | null> {
  const porCidade = new Map<number, number | null>();
  for (const variavel of resposta) {
    for (const bloco of variavel.resultados) {
      for (const serie of bloco.series) {
        porCidade.set(Number(serie.localidade.id), valorDaSerie(serie.serie));
      }
    }
  }
  return porCidade;
}

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

export interface CidadeMaoDeObra {
  id: number;
  nome: string;
  uf: string;
}

export interface ResultadoMaoDeObraCidade {
  id: number;
  nome: string;
  uf: string;
  /** Estoque combinado dos 2 grupamentos ocupacionais (mil pessoas). */
  estoqueMil: number | null;
  peaMil: number | null;
  estoquePorPEA: number | null;
  /** Rendimento médio, ponderado pelo estoque de cada grupamento. */
  rendimentoMedio: number | null;
  desempregoPct: number | null;
  scoreEstoque: number | null;
  scoreCusto: number | null;
  scoreDesemprego: number | null;
  nota: number | null;
  erro?: string;
}

export const calcularMaoDeObra = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as { cidades: CidadeMaoDeObra[] })
  .handler(async ({ data }): Promise<ResultadoMaoDeObraCidade[]> => {
    const cidades = data.cidades.slice(0, 5);
    if (cidades.length === 0) return [];

    const codigos = cidades.map((c) => c.id);

    let estoqueResp: SidraRespostaPNAD;
    let rendimentoResp: SidraRespostaPNAD;
    let desempregoResp: SidraRespostaPNAD;
    let peaResp: SidraRespostaPNAD;
    try {
      [estoqueResp, rendimentoResp, desempregoResp, peaResp] = await Promise.all([
        consultarPnad(5435, 4090, codigos, GRUPOS_OCUPACIONAIS),
        consultarPnad(5444, 5932, codigos, GRUPOS_OCUPACIONAIS),
        consultarPnad(4099, 4099, codigos),
        consultarPnad(4093, 4088, codigos),
      ]);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Falha ao consultar o IBGE PNAD Contínua/SIDRA";
      return cidades.map((c) => ({
        id: c.id,
        nome: c.nome,
        uf: c.uf,
        estoqueMil: null,
        peaMil: null,
        estoquePorPEA: null,
        rendimentoMedio: null,
        desempregoPct: null,
        scoreEstoque: null,
        scoreCusto: null,
        scoreDesemprego: null,
        nota: null,
        erro: mensagem,
      }));
    }

    const estoquePorCidade = porCidadePorGrupo(estoqueResp);
    const rendimentoPorCidade = porCidadePorGrupo(rendimentoResp);
    const desempregoPorCidade = porCidadeSimples(desempregoResp);
    const peaPorCidade = porCidadeSimples(peaResp);

    const brutos = cidades.map((cidade) => {
      const estoquePorGrupo = estoquePorCidade.get(cidade.id);
      const rendimentoPorGrupo = rendimentoPorCidade.get(cidade.id);
      const pea = peaPorCidade.get(cidade.id) ?? null;
      const desemprego = desempregoPorCidade.get(cidade.id) ?? null;

      if (!estoquePorGrupo || !rendimentoPorGrupo || pea === null || desemprego === null) {
        return {
          id: cidade.id,
          nome: cidade.nome,
          uf: cidade.uf,
          estoqueMil: null,
          peaMil: pea,
          estoquePorPEA: null,
          rendimentoMedio: null,
          desempregoPct: desemprego,
          erro: "PNAD Contínua não tem amostra suficiente pra esta cidade (cobre bem só capitais/grandes cidades).",
        };
      }

      const valores = GRUPOS_OCUPACIONAIS.map((g) => ({
        estoque: estoquePorGrupo.get(g) ?? null,
        rendimento: rendimentoPorGrupo.get(g) ?? null,
      })).filter((v): v is { estoque: number; rendimento: number } => v.estoque !== null && v.rendimento !== null);

      if (valores.length === 0) {
        return {
          id: cidade.id,
          nome: cidade.nome,
          uf: cidade.uf,
          estoqueMil: null,
          peaMil: pea,
          estoquePorPEA: null,
          rendimentoMedio: null,
          desempregoPct: desemprego,
          erro: "PNAD Contínua suprimiu o dado por amostra pequena nesta cidade.",
        };
      }

      const estoqueMil = valores.reduce((acc, v) => acc + v.estoque, 0);
      const rendimentoMedio = valores.reduce((acc, v) => acc + v.rendimento * v.estoque, 0) / estoqueMil;
      const estoquePorPEA = pea > 0 ? estoqueMil / pea : null;

      return {
        id: cidade.id,
        nome: cidade.nome,
        uf: cidade.uf,
        estoqueMil,
        peaMil: pea,
        estoquePorPEA,
        rendimentoMedio,
        desempregoPct: desemprego,
      };
    });

    const scoresEstoque = minmaxNota(brutos.map((r) => r.estoquePorPEA));
    const scoresCusto = minmaxNota(
      brutos.map((r) => r.rendimentoMedio),
      false,
    );
    const scoresDesemprego = minmaxNota(brutos.map((r) => r.desempregoPct));

    return brutos.map((r, i) => {
      const scoreEstoque = scoresEstoque[i] ?? null;
      const scoreCusto = scoresCusto[i] ?? null;
      const scoreDesemprego = scoresDesemprego[i] ?? null;
      const nota =
        scoreEstoque !== null && scoreCusto !== null && scoreDesemprego !== null
          ? (scoreEstoque + scoreCusto + scoreDesemprego) / 3
          : null;
      return { ...r, scoreEstoque, scoreCusto, scoreDesemprego, nota };
    });
  });

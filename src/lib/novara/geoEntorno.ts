/* ============================================================================
 * Módulo E do algoritmo — entorno por raio empírico, para qualquer cidade do
 * Brasil. Porta direta do Python documentado em
 * `Metodologias do Critério 1/algoritmo_tam_sam_som.md` seção 7: centróide de
 * polígono (shoelace), distância haversine, malha de município via IBGE.
 *
 * Raio: 312km é a média dos 2 raios reais observados nos CDs da Novara
 * (Curitiba→Guarapuava 361,3km; Florianópolis→Lages 263km) — não é arbitrário,
 * é o comportamento real da operação, aplicado a qualquer cidade nova por
 * falta de um raio próprio observado nela (mesma decisão da seção 1.3.1).
 *
 * Malha buscada: a própria UF da cidade, mais vizinha direta e vizinha-de-
 * vizinha (2 saltos) — o suficiente pra cobrir 312km mesmo a partir de UF
 * pequena (ex.: SE só faz fronteira com AL e BA — sem o 2º salto, um raio de
 * 312km a partir de uma capital como Aracaju estouraria a malha buscada). A
 * seção 1.3.1 do relatório estático resolvia isso à mão, candidata a
 * candidata, com um aviso explícito de que as cidades de UF grande ficaram
 * só na própria UF "por ora" — "pode haver alguma perda residual em bordas
 * de estado não carregado". A regra de 2 saltos generaliza essa mesma
 * decisão pra qualquer cidade nova, fechando esse buraco.
 *
 * Correção (23/08/2026): o Distrito Federal tinha um caso especial capado em
 * 1 salto (só GO), sob a suposição de que 2 saltos "adicionaria MT/BA/MG
 * inteiros sem necessidade real". Isso causava subcontagem real, não só
 * ineficiência — reproduzindo o cálculo direto contra o IBGE Malhas: GO
 * sozinho já não bastava, MG e BA contribuíam município adicional dentro do
 * raio. O DF agora usa a mesma regra genérica de 2 saltos que todo o resto;
 * UFs sem município no raio só custam uma chamada de malha a mais, não
 * distorcem o resultado.
 * ==========================================================================*/

export const RAIO_KM_PADRAO = 312;

const MALHAS_BASE = "https://servicodados.ibge.gov.br/api/v3/malhas";

type GeoPosition = [number, number];
interface PolygonGeometry {
  type: "Polygon";
  coordinates: GeoPosition[][];
}
interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: GeoPosition[][][];
}
type MunicipioGeometry = PolygonGeometry | MultiPolygonGeometry;
interface MalhaFeature {
  properties: { codarea: string };
  geometry: MunicipioGeometry;
}
interface MalhaFeatureCollection {
  features: MalhaFeature[];
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Centróide de um anel fechado [lon, lat][] pela fórmula padrão de área (shoelace). */
function centroidePoligono(coords: GeoPosition[]): { lat: number; lon: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i]!;
    const p1 = coords[i + 1]!;
    const cross = p0[0] * p1[1] - p1[0] * p0[1];
    area += cross;
    cx += (p0[0] + p1[0]) * cross;
    cy += (p0[1] + p1[1]) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-12) {
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return {
      lon: lons.reduce((a, b) => a + b, 0) / lons.length,
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
    };
  }
  return { lon: cx / (6 * area), lat: cy / (6 * area) };
}

/** Maior anel externo por área — aproximação suficiente pra fins de distância entre cidades. */
function maiorAnel(rings: GeoPosition[][]): GeoPosition[] {
  let melhor = rings[0]!;
  let melhorArea = -1;
  for (const anel of rings) {
    let area = 0;
    for (let i = 0; i < anel.length - 1; i++) {
      const p0 = anel[i]!;
      const p1 = anel[i + 1]!;
      area += p0[0] * p1[1] - p1[0] * p0[1];
    }
    area = Math.abs(area) / 2;
    if (area > melhorArea) {
      melhorArea = area;
      melhor = anel;
    }
  }
  return melhor;
}

function centroideMunicipio(geometry: MunicipioGeometry): { lat: number; lon: number } {
  const aneis =
    geometry.type === "Polygon"
      ? [geometry.coordinates[0]!]
      : geometry.coordinates.map((p) => p[0]!);
  return centroidePoligono(maiorAnel(aneis));
}

export interface MunicipioGeo {
  id: number;
  lat: number;
  lon: number;
}

/** Centróide de todo município de uma UF, numa chamada só (malha do estado inteiro). */
export async function buscarCentroidesDaUF(ufSigla: string): Promise<MunicipioGeo[]> {
  const url = `${MALHAS_BASE}/estados/${ufSigla}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`;
  const resposta = await fetch(url);
  if (!resposta.ok)
    throw new Error(`IBGE Malhas respondeu ${resposta.status} para a UF ${ufSigla}`);
  const geo = (await resposta.json()) as MalhaFeatureCollection;
  return geo.features.map((f) => {
    const { lat, lon } = centroideMunicipio(f.geometry);
    return { id: Number(f.properties.codarea), lat, lon };
  });
}

/**
 * Centróide de um único município — usado pra capitais de UF fornecedora
 * (Critério 3, abastecimento), onde baixar a malha do estado inteiro só pra
 * pegar 1 centróide seria caro à toa (MG sozinho tem 853 municípios). Nota:
 * o endpoint de município fica sob `/malhas/municipios/{codigo}`, diferente
 * do de estado (`/malhas/estados/{sigla}`) — confirmado por tentativa, o
 * padrão genérico `/malhas/{codigo}` responde 404 pra município.
 */
export async function buscarCentroideMunicipio(codigo: number): Promise<MunicipioGeo> {
  const url = `${MALHAS_BASE}/municipios/${codigo}?formato=application/vnd.geo+json&qualidade=minima`;
  const resposta = await fetch(url);
  if (!resposta.ok)
    throw new Error(`IBGE Malhas respondeu ${resposta.status} para o município ${codigo}`);
  const geo = (await resposta.json()) as MalhaFeatureCollection;
  const feature = geo.features[0];
  if (!feature) throw new Error(`IBGE Malhas não retornou geometria para o município ${codigo}`);
  const { lat, lon } = centroideMunicipio(feature.geometry);
  return { id: codigo, lat, lon };
}

/**
 * UFs que fazem fronteira direta, por sigla — geografia estável, nunca muda.
 * Usada para decidir de qual(is) UF vizinha(s) também buscar malha: um raio
 * de 312km facilmente ultrapassa os limites de UF pequena (RN, SE, AL, ES,
 * DF...), e restringir a busca só à própria UF da cidade sub-conta o entorno
 * real nesses casos — mesmo problema que a seção 1.3.1 do relatório estático
 * resolvia manualmente, candidata a candidata. Aqui a mesma decisão vira
 * regra genérica: sempre incluir vizinho direto, e vizinho-de-vizinho (2
 * saltos) — o suficiente pra cobrir 312km a partir de um estado pequeno sem
 * precisar de heurística de posição.
 */
const UF_VIZINHAS: Record<string, string[]> = {
  AC: ["AM", "RO"],
  AL: ["PE", "SE", "BA"],
  AP: ["PA"],
  AM: ["AC", "RO", "MT", "PA", "RR"],
  BA: ["SE", "AL", "PE", "PI", "TO", "GO", "MG", "ES"],
  CE: ["PI", "PE", "PB", "RN"],
  DF: ["GO"],
  ES: ["BA", "MG", "RJ"],
  GO: ["MT", "TO", "BA", "MG", "MS", "DF"],
  MA: ["PA", "TO", "PI"],
  MT: ["RO", "AM", "PA", "TO", "GO", "MS"],
  MS: ["MT", "GO", "MG", "SP", "PR"],
  MG: ["BA", "ES", "RJ", "SP", "MS", "GO"],
  PA: ["AP", "MA", "TO", "MT", "AM", "RR"],
  PB: ["RN", "CE", "PE"],
  PE: ["PB", "CE", "PI", "BA", "AL"],
  PI: ["MA", "CE", "PE", "BA", "TO"],
  PR: ["SP", "MS", "SC"],
  RJ: ["ES", "MG", "SP"],
  RN: ["CE", "PB"],
  RO: ["AC", "AM", "MT"],
  RR: ["AM", "PA"],
  RS: ["SC"],
  SC: ["PR", "RS"],
  SP: ["RJ", "MG", "MS", "PR"],
  SE: ["AL", "BA"],
  TO: ["PA", "MA", "PI", "BA", "GO", "MT"],
};

/**
 * UF(s) cuja malha buscar para achar o entorno de uma cidade: a própria UF,
 * mais vizinha direta e vizinha-de-vizinha (2 saltos) — o suficiente pra
 * cobrir um raio de 312km mesmo a partir de UF pequena (ex.: RN só faz
 * fronteira direta com CE e PB — sem o 2º salto, PE, que entra via PB,
 * ficaria de fora). Sem exceção pro Distrito Federal — ver a correção
 * documentada no topo do arquivo: capar o DF em 1 salto (só GO) subcontava
 * municípios reais que caem dentro de 312km do centróide de Brasília.
 */
export function ufsParaEntorno(ufSigla: string): string[] {
  const diretas = UF_VIZINHAS[ufSigla] ?? [];
  const doisSaltos = diretas.flatMap((uf) => UF_VIZINHAS[uf] ?? []);
  return [...new Set([ufSigla, ...diretas, ...doisSaltos])];
}

export interface MunicipioNoRaio {
  id: number;
  distanciaKm: number;
}

/**
 * Acha todo município dentro do raio a partir do centróide da cidade-sede,
 * excluindo a própria sede e qualquer capital estadual (ARMADILHA #5).
 */
export function acharEntornoNoRaio(
  centroideSede: MunicipioGeo,
  candidatos: MunicipioGeo[],
  raioKm: number,
  idsExcluidos: Set<number>,
): MunicipioNoRaio[] {
  const dentro: MunicipioNoRaio[] = [];
  for (const c of candidatos) {
    if (c.id === centroideSede.id) continue;
    if (idsExcluidos.has(c.id)) continue;
    const distanciaKm = haversineKm(centroideSede.lat, centroideSede.lon, c.lat, c.lon);
    if (distanciaKm <= raioKm) dentro.push({ id: c.id, distanciaKm });
  }
  return dentro.sort((a, b) => a.distanciaKm - b.distanciaKm);
}

/* ============================================================================
 * Conteúdo estático da página /metodologia — não tem cálculo nenhum aqui,
 * só a explicação passo a passo de cada critério/subcritério do case,
 * consolidada a partir dos documentos de metodologia (`Metodologias do
 * Critério N/algoritmo_*.md`) e do documento final (`Documento Final/
 * build_doc.js`, seções 4–5). Qualquer número citado aqui é o mesmo já
 * usado/validado no simulador e nas páginas de fonte externa — nada foi
 * recalculado só para esta página.
 * ==========================================================================*/

export interface Subcriterio {
  id: string;
  titulo: string;
  pergunta: string;
  fonteInterna?: string;
  fonteExterna?: string;
  /** Passo a passo do algoritmo, na ordem em que é executado. */
  passos: string[];
  formula?: string;
  notaFormula?: string;
  armadilhas?: string[];
  resultado?: string;
  aoVivo: boolean;
}

export interface Criterio {
  id: string;
  numero: string;
  titulo: string;
  pergunta: string;
  pesoInterno?: string;
  notaFormula?: string;
  subcriterios: Subcriterio[];
}

export const CRITERIOS: Criterio[] = [
  {
    id: "criterio-1",
    numero: "1",
    titulo: "Mercado",
    pergunta:
      "Quanto de receita a Novara consegue capturar nessa cidade, e por quanto tempo essa receita cresce?",
    pesoInterno: "1.1 × 50% + 1.2 × 25% + 1.3 × 25%",
    notaFormula: "Nota_Critério1 = 0,50 × nota 1.1 (SAM sede) + 0,25 × nota 1.2 (crescimento) + 0,25 × nota 1.3 (entorno)",
    subcriterios: [
      {
        id: "c1-tam",
        titulo: "1.1a — TAM (de cima para baixo)",
        pergunta: "Qual o tamanho do mercado atacadista inteiro da cidade, de qualquer setor? Serve só de contexto — nunca entra na nota.",
        fonteExterna: "IBGE PAC 2023 (Tabela 12, receita do comércio atacadista por UF) + IBGE CEMPRE/SIDRA (tabela 9418, nº de atacadistas CNAE 46)",
        passos: [
          "Baixar a Tabela 12 da PAC do ano mais recente (arquivo xlsx, FTP — não tem API) e ler a receita de \"Comércio por atacado\" da UF.",
          "Contar nº de atacadistas (CNAE divisão 46 inteira, código 117376) na cidade, via CEMPRE/SIDRA, nível município (N6).",
          "Contar o mesmo nº na UF inteira, nível N3.",
          "participação = nº_atacadistas_cidade ÷ nº_atacadistas_UF",
          "TAM_cidade = PAC_UF × participação",
        ],
        formula: "TAM_cidade = PAC_atacadista_UF × (nº_atacadistas_cidade / nº_atacadistas_UF)",
        armadilhas: [
          "Distrito Federal é caso especial: não tem municípios — Brasília é o DF inteiro pro IBGE, então participação = 100% sempre, sem rateio de verdade (relevante se uma candidata futura cair num DF).",
        ],
        aoVivo: true,
      },
      {
        id: "c1-1",
        titulo: "1.1b — SAM e SOM (de baixo para cima)",
        pergunta: "Ancorado 100% em dado real da Novara: quanto as empresas-alvo da cidade gastariam, no ticket médio que a Novara já pratica?",
        fonteInterna: "net_revenue por customer_category e cep (proxy de cliente cep+categoria) → ticket médio real por categoria, calibrado sobre toda a base (97 cidades)",
        fonteExterna: "IBGE CEMPRE/SIDRA (tabela 9418, variável 2585) — nº de empresas por CNAE-alvo, nível município",
        passos: [
          "Mapear as categorias de cliente da base (customer_category) para 12 grupos-CNAE (ex.: Restaurantes → 56.11-2), excluindo categorias sem CNAE confiável (\"Dono(a) de Casa\", \"Outros\" etc.).",
          "Calcular o ticket médio anual real por grupo-CNAE: net_revenue do grupo ÷ nº de clientes-proxy (cep+categoria) ÷ 7 meses × 12 — usando a base inteira (97 cidades), não só Curitiba/Florianópolis.",
          "Consultar o CEMPRE/SIDRA: nº de empresas por CNAE-alvo, na cidade, ano 2024 (12 categorias, incluindo Hospitalar).",
          "SAM = Σ (nº de empresas da categoria × ticket médio anual da categoria), para as 11 categorias — excluindo Hospitalar.",
          "Checagem de sanidade obrigatória: SAM tem que ser menor que TAM sempre — se não for, parar e investigar.",
          "SOM = SAM × penetração-âncora (8,2%, a penetração real de Florianópolis depois de ~2 anos de operação — a mais conservadora das âncoras observadas entre as praças já maduras).",
        ],
        formula: "SAM = Σ_categoria [nº_empresas_categoria × ticket_médio_anual_categoria]  ·  SOM = SAM × 8,2%",
        armadilhas: [
          "CNAE 86.10-1 (Hospitalar) tem contagem não confiável no CEMPRE — confirmado em 4 municípios (ex.: Porto Alegre, 33,7% do SAM da cidade vindo só daí). Excluído sempre da soma.",
          "\"-\" do CEMPRE é sigilo estatístico (amostra pequena), não é zero — tratar diferente de \"zero empresas\" real.",
          "Proxy de cliente = cep + customer_category, nunca cep sozinho — 28% dos CEPs têm mais de uma categoria.",
        ],
        notaFormula: "nota 1.1 = min-max direto (maior SAM = melhor), relativo às cidades selecionadas",
        resultado: "Nas 4 candidatas do case: Goiânia lidera (R$515,06mi), depois Campinas (R$470,60mi), Porto Alegre (R$288,72mi) e Uberlândia (R$125,75mi).",
        aoVivo: true,
      },
      {
        id: "c1-2",
        titulo: "1.2 — Potencial de crescimento",
        pergunta: "O dinamismo econômico da cidade, no nicho exato da Novara, está subindo ou caindo?",
        fonteExterna: "IBGE CEMPRE/SIDRA, mesmas 11 CNAEs-alvo (sem Hospitalar), séries 2022 e 2024 (2021 não existe nessa tabela)",
        passos: [
          "Consultar o CEMPRE/SIDRA para 2022 e 2024, mesmas 11 CNAEs-alvo, só da cidade-sede — nunca do entorno.",
          "CAGR = (empresas_2024 / empresas_2022)^(1/2) − 1",
          "Projeção = empresas_2024 × (1 + CAGR)^(ano_alvo − 2024)",
        ],
        formula: "CAGR = (Empresas₂₀₂₄ / Empresas₂₀₂₂)^(1/2) − 1",
        armadilhas: [
          "Série de só 3 anos (2022–2024) não distingue tendência de ruído — Campinas teve queda de 2023 para 2024 (Restaurantes) que o CAGR ponta-a-ponta não capta.",
          "\"Armadilha do raio fixo\": crescimento nunca é calculado no entorno. Um raio de 312km facilmente engole outras capitais inteiras (Brasília cai dentro do raio de Goiânia) — misturar isso com o interior mascararia o dado real (o interior da região Sul está de fato perdendo empresas, -1,6%/ano no raio de Curitiba).",
        ],
        notaFormula: "nota 1.2 = min-max direto (maior CAGR = melhor)",
        resultado: "Campinas lidera (+6,89%/ano), seguida por Goiânia (+3,39%), Uberlândia (+2,72%) e Porto Alegre, a mais lenta (+1,36%).",
        aoVivo: true,
      },
      {
        id: "c1-3",
        titulo: "1.3 — Mercado no entorno",
        pergunta: "Fora da cidade-sede, quanto mercado adicional existe num raio operacionalmente viável do CD?",
        fonteInterna: "latitude/longitude de cada cliente real da base (Curitiba/Florianópolis) — usada só para calibrar o raio empírico",
        fonteExterna: "IBGE Malhas (geometria de município, para centróide) + CEMPRE/SIDRA (mesma contagem do SAM, agora para cada município do entorno)",
        passos: [
          "Determinar o raio: 312km, a média dos 2 raios reais observados nos CDs da Novara (Curitiba → Guarapuava, 361,3km; Florianópolis → Lages, 263,0km) — não é arbitrário, é comportamento real da operação.",
          "Calcular o centróide de cada município candidato via malha do IBGE (fórmula de área/shoelace sobre o polígono do GeoJSON), sem biblioteca de geoprocessamento.",
          "Medir a distância haversine do centróide da sede a cada município da UF (+ vizinha direta + vizinha-de-vizinha, pra não subcontar UF pequena).",
          "Filtrar só os municípios dentro de 312km.",
          "Excluir qualquer capital de estado inteira que caia dentro do raio (Armadilha #5) — é outra decisão de expansão completa, não uma \"cidade satélite de graça\".",
          "Somar o SAM (mesmo cálculo de 1.1) de todos os municípios restantes = SAM entorno líquido.",
          "Métrica final: SAM entorno ÷ nº de municípios do entorno (SAM médio por município) — corrige o viés de densidade administrativa (Minas Gerais tem 853 municípios contra 417 da Bahia; um raio igual captura universos muito diferentes por motivo administrativo, não econômico).",
        ],
        formula: "SAM médio/município = SAM_entorno_líquido ÷ nº_municípios_no_raio",
        armadilhas: [
          "Um raio de 312km facilmente ultrapassa os limites de uma UF pequena — por isso a busca inclui vizinha direta e vizinha-de-vizinha.",
          "Nem tudo que cai \"dentro do raio\" deve ser somado: ilha sem acesso terrestre (Fernando de Noronha), ou outra capital de estado inteira (Brasília no raio de Goiânia).",
          "SAM total bruto (sem dividir por município) favorece artificialmente estados com muitos municípios pequenos — por isso a métrica final usa a média, não o total.",
        ],
        notaFormula: "nota 1.3 = min-max direto sobre o SAM médio por município (maior = melhor)",
        resultado: "Campinas lidera (R$3,1mi/município), seguida por Goiânia (R$2,8mi), Porto Alegre (R$2,6mi) e Uberlândia, a última (R$1,9mi).",
        aoVivo: true,
      },
    ],
  },
  {
    id: "criterio-2",
    numero: "2",
    titulo: "Operação",
    pergunta:
      "Dado que a Novara conquista um cliente na cidade nova, quanto sobra de margem por cliente depois do custo de servi-lo?",
    pesoInterno: "25% para cada um dos 4 subcritérios (2.2 e 2.3 recebem nota neutra 5,00 — não diferenciam cidade)",
    notaFormula: "Nota_Critério2 = média(nota 2.1, nota 2.2, nota 2.3, nota 2.4) — no simulador, só 2.1 e 2.4 variam, então a nota exibida é média(2.1, 2.4)",
    subcriterios: [
      {
        id: "c2-1",
        titulo: "2.1 — Ticket médio provável",
        pergunta: "Quanto a Novara provavelmente vai faturar por cliente/mês numa cidade onde ainda não opera?",
        fonteInterna: "net_revenue por região (PR, SC) — ticket real recalculado, usado como âncora de calibração",
        fonteExterna: "IBGE CEMPRE/SIDRA (variável 662, massa salarial + 2585, nº de empresas), nível UF inteira",
        passos: [
          "Calcular o \"porte médio\" de uma UF: massa salarial anual total ÷ nº de empresas das 11 CNAEs-alvo (mesma fonte do SAM), nível UF — nunca raio.",
          "Calibrar o índice K uma única vez: K = ticket_real_da_sede ÷ porte_médio_da_UF-sede = 2.130,55 ÷ 346.691,71 = 0,0061450.",
          "Para qualquer UF nova: ticket_estimado = K × porte_médio_da_UF.",
        ],
        formula: "Ticket_estimado_UF = K × Porte_médio_UF,  K = Ticket_real_da_sede ÷ Porte_médio_da_UF-sede",
        armadilhas: [
          "Primeira tentativa comparou porte da UF-sede (UF inteira) contra o porte da segunda praça (só o raio de Florianópolis) — escalas diferentes infladas o erro artificialmente. Corrigido: os dois lados sempre em nível de UF inteira.",
          "Depois da correção, validado contra a segunda praça: erro residual de −11,2% (o modelo subestima — direção conservadora, não perigosa).",
          "É um proxy de massa salarial, não faturamento — o CEMPRE não publica faturamento por empresa, só estrutura de emprego.",
        ],
        notaFormula: "nota 2.1 = min-max direto (maior ticket estimado = melhor)",
        resultado: "Goiânia lidera disparada (R$2.654,18/mês, puxada pelo funcionalismo público), depois Campinas, Uberlândia e Porto Alegre, a mais baixa.",
        aoVivo: true,
      },
      {
        id: "c2-2",
        titulo: "2.2 — Frequência de compra",
        pergunta: "Com que frequência um cliente ativo de fato compra da Novara?",
        fonteInterna: "month × proxy de cliente (cep+categoria) — nº de meses ativos no período, base inteira",
        passos: [
          "Contar, para cada cliente-proxy, em quantos dos 7 meses da janela ele comprou pelo menos uma vez.",
          "Calcular a frequência relativa por praça: 64,5% em Curitiba, 58,7% em Florianópolis.",
        ],
        armadilhas: [
          "Não há fonte externa capaz de estimar isso pra uma cidade nova — é usado como premissa constante, igual pras 4 candidatas.",
        ],
        notaFormula: "não diferencia cidade — recebe nota neutra (5,00) no cálculo do Critério 2",
        aoVivo: false,
      },
      {
        id: "c2-3",
        titulo: "2.3 — Margem bruta",
        pergunta: "Depois do custo de mercadoria, quanto sobra de margem?",
        fonteInterna: "net_revenue + cogs (gross_profit = net_revenue + cogs), Curitiba e Florianópolis",
        passos: [
          "Calcular a margem real das 2 praças: Curitiba 13,20%, Florianópolis 11,45%.",
          "Testar a hipótese \"logística pior reduz a margem\": Florianópolis tem logística melhor (mais concentrada) E margem menor — direção oposta à esperada. Hipótese refutada pelos 2 pontos reais disponíveis.",
          "Decisão: usar a margem de Florianópolis (11,45%, mais conservadora) como constante para as 4 candidatas, sem ajuste calibrado por cidade.",
        ],
        armadilhas: [
          "Só 2 pontos reais (Curitiba, Florianópolis) não são suficientes pra calibrar uma relação margem×logística — a refutação é honesta, mas não é uma prova estatística forte.",
        ],
        notaFormula: "não diferencia cidade — recebe nota neutra (5,00) no cálculo do Critério 2",
        aoVivo: false,
      },
      {
        id: "c2-4",
        titulo: "2.4 — Fricção logística",
        pergunta: "Quão caro é, operacionalmente, servir os clientes espalhados nessa cidade e seu entorno?",
        fonteInterna: "latitude/longitude de cada cliente real (Curitiba, Florianópolis) — calibração do método",
        fonteExterna: "IBGE Malhas (centróide de município) — mesmo entorno do Módulo E (1.3)",
        passos: [
          "Reaproveitar a mesma lista de municípios do entorno (1.3) e o nº de empresas-alvo de cada um (peso).",
          "Distância-tronco: média das distâncias haversine da sede a cada município do entorno (incluindo a própria sede, distância 0), ponderada pelo nº de empresas-alvo — se a sede concentra quase toda a massa, a distância fica perto de zero.",
          "Centro de gravidade: latitude/longitude médias, ponderadas pelo nº de empresas-alvo de cada ponto.",
          "Dispersão espacial: desvio padrão das distâncias de cada ponto até esse centro de gravidade, também ponderado.",
          "Nota final: média de duas notas min-max invertidas (menor distância/dispersão = melhor) — uma para distância-tronco, outra para dispersão.",
        ],
        formula: "Dist_tronco = Σ(dist_i × peso_i) / Σpeso_i  ·  Dispersão = √[Σ(dist_ao_CG_i² × peso_i) / Σpeso_i]",
        armadilhas: [
          "O método usa centróide de município (não CEP de cliente real) — validado contra CEP real de Curitiba/Florianópolis e confirmado que superestima a dispersão em escala absoluta (~3x). O ranking relativo entre cidades continua válido; os km absolutos, não.",
        ],
        notaFormula: "nota 2.4 = média(nota_distância invertida, nota_dispersão invertida)",
        resultado: "Goiânia lidera (mercado super concentrado na fronteira DF-GO), Florianópolis é o benchmark histórico; Curitiba e Campinas ficam com a pior dispersão do case.",
        aoVivo: true,
      },
    ],
  },
  {
    id: "criterio-3",
    numero: "3",
    titulo: "Abastecimento do CD",
    pergunta:
      "Para essa cidade, a Novara consegue suprir o mix de produtos que já vende hoje, com fornecedores disponíveis a uma distância operacionalmente viável?",
    subcriterios: [
      {
        id: "c3-1",
        titulo: "Score de abastecimento",
        pergunta: "Ponderando pelo que a Novara mais vende, quão perto estão os polos fornecedores nacionais dessa categoria?",
        fonteInterna: "product_category × net_revenue — peso% de cada uma das 48 categorias no mix real (base inteira)",
        fonteExterna: "IBGE Classificação CNAE (mapeamento categoria→CNAE) + CEMPRE/SIDRA (nº de empresas por CNAE, nacional) + IBGE Malhas (centróide da capital de cada UF fornecedora)",
        passos: [
          "Mapear as 48 categorias de produto da base para 34 CNAEs de fornecedor únicos — duas camadas quando aplicável: indústria/produção (ex.: divisão 10, abate/laticínios) e comércio atacadista especializado (grupo 46.3); categorias de commodity seca sem CNAE nichado usam 46397 (atacado de alimentícios em geral) como fallback.",
          "Converter cada CNAE pontuado (ex.: 46.32-0) para o id interno do SIDRA usado na tabela 9418.",
          "Consultar o CEMPRE/SIDRA nacional (as 27 UFs de uma vez): nº de empresas por CNAE-fornecedor, ano 2024.",
          "Para cada uma das 48 categorias, somar a contagem das UFs e pegar o top-5 nacional (UFs com mais empresas naquele CNAE).",
          "Calcular a distância haversine da cidade candidata até a capital de cada UF do top-5, ponderada pelo nº de empresas de cada UF no top-5 — não há granularidade de município do lado fornecedor, só UF.",
          "Peso de cada categoria no score = participação dela na receita líquida da base inteira (mesma convenção do ticket médio em 2.1).",
          "Score_abastecimento_cidade = Σ (peso%_categoria × distância_média_ponderada_categoria) — cidade com menor score está, em média, mais perto dos polos fornecedores nacionais.",
        ],
        formula: "Score_abastecimento_cidade = Σ_categoria [peso%_categoria × distância_média_ponderada_categoria]",
        armadilhas: [
          "São Paulo lidera 44 das 48 categorias — por si só não diferencia nenhuma cidade candidata (o \"polo #1\" seria sempre o mesmo). Quem diferencia é a distância até os polos, não quem é o polo.",
          "A CNAE não distingue subcategoria da Novara — as 5 subcategorias de \"Carnes\" e as 7 de laticínios colapsam nos mesmos números.",
          "Só existe granularidade de UF do lado fornecedor (RFB indisponível pra CNPJ individual) — a distância é sempre sede-cidade → capital-UF, nunca ponto a ponto.",
        ],
        notaFormula: "nota Critério 3 = min-max invertido sobre o Score (menor km ponderado = melhor)",
        resultado: "Campinas lidera com folga (dentro do próprio eixo industrial Sudeste), Goiânia em 2º, Porto Alegre em 3º, Uberlândia a mais distante das 4.",
        aoVivo: true,
      },
    ],
  },
  {
    id: "criterio-4",
    numero: "4",
    titulo: "Risco e Concorrência",
    pergunta:
      "O quão provável é que o valor projetado nos Critérios 1–3 de fato se realize? Único critério que não gera R$ diretamente — gera um haircut aplicado sobre o VPL.",
    pesoInterno: "4.1 × 30% + 4.2 × 20% + 4.3 × 25% + 4.4 × 25%",
    notaFormula: "Nota_Critério4 = 0,30×4.1 + 0,20×4.2 + 0,25×4.3 + 0,25×4.4  ·  Haircut sobre o VPL = 5% (piso) + 30% × (10 − Nota_Critério4) / 10",
    subcriterios: [
      {
        id: "c4-1",
        titulo: "4.1 — Risco tributário",
        pergunta: "Qual a carga efetiva de ICMS — não a alíquota nominal — que a operação pagaria nessa cidade?",
        fonteExterna: "Pesquisa dirigida (SEFAZ estaduais, RICMS, leis/decretos, agregadores tributários) — não existe API pública de alíquota/incentivo fiscal por estado",
        passos: [
          "Coletar, por pesquisa dirigida, os 27 estados: alíquota interna de ICMS vigente, existência de ICMS-ST pro setor atacadista de alimentos, e programa de incentivo fiscal pra atacado/CD.",
          "Cruzar 2-3 fontes por estado (agregadores tributários + lei/decreto primário e SEFAZ nos estados prioritários).",
          "Estimar a carga efetiva com confiança explícita: se há percentual final confirmado em decreto/lei (ex.: RN, 6,1%), usar direto; se o incentivo existe mas o percentual não é confirmável pro setor específico, não presumir redução — usar a alíquota nominal (postura conservadora).",
          "Rodar também um cenário otimista (supondo habilitação no melhor incentivo identificado) — pra checar se a comparação é sensível à hipótese.",
          "Nota: min-max invertido (menor carga = melhor).",
        ],
        formula: "nota_4.1 = (carga_máxima_da_amostra − carga_da_cidade) / (carga_máxima − carga_mínima) × 10",
        armadilhas: [
          "Único subcritério sem fonte pública automatizável — pesquisa dirigida, majoritariamente agregadores privados, recomenda-se validação com tributarista antes de virar número definitivo.",
          "Percentuais de carga efetiva geralmente dependem de habilitação em regime especial (sede na UF, faturamento mínimo etc.) — não são automáticos.",
        ],
        notaFormula: "nota 4.1 = min-max invertido (menor carga efetiva = melhor)",
        resultado: "Achado robusto: Uberlândia lidera com folga (carga de 6,1%, regime especial confirmado em decreto) e não muda de posição entre o cenário conservador e o otimista.",
        aoVivo: false,
      },
      {
        id: "c4-2",
        titulo: "4.2 — Conhecimento de mercado local",
        pergunta: "O quanto a Novara já conhece essa praça — rede de contato, dinâmica competitiva, cultura de negociação local?",
        fonteExterna: "Proxy: IBGE Malhas (centróide, para distância) — o método real é humano, não tem fonte externa que substitua",
        passos: [
          "O método real (definitivo) é um scorecard qualitativo 1–10 respondido individualmente pelos diretores da Novara, sem ver a resposta dos outros antes — nota do subcritério = média das notas de todos os diretores.",
          "Enquanto essa resposta não chega: calcular um proxy provisório com 2 sinais objetivos — distância geográfica até a operação mais próxima (Curitiba ou Florianópolis, o menor dos dois) e se a cidade é ou não a mesma região (Sul).",
          "score_distância = min-max invertido da distância (menor = melhor, mais familiaridade informal).",
          "score_região = 10 se Sul, 0 se não.",
          "nota_4.2_proxy = média(score_distância, score_região).",
        ],
        formula: "nota_4.2_proxy = média(score_distância_invertido, score_região)",
        armadilhas: [
          "Isto não mede conhecimento real — não sabe se um vendedor específico já vendeu ali. É um proxy grosseiro mas defensável na ausência do dado real.",
          "Substituir, nunca somar, quando o scorecard real da diretoria chegar — os 2 sinais do proxy já estão implicitamente nas subperguntas reais.",
        ],
        resultado: "Uberlândia lidera (251km da operação mais próxima, mesma região), Porto Alegre em 2º; Campinas e Goiânia ficam próximas de zero (fora do Sul, mais de 1.600km).",
        aoVivo: false,
      },
      {
        id: "c4-3",
        titulo: "4.3 — Disponibilidade de mão de obra",
        pergunta: "É fácil e barato contratar motorista, auxiliar de logística/armazém e vendedor nessa cidade?",
        fonteExterna: "IBGE PNAD Contínua/SIDRA (RAIS/CAGED por CBO exata está indisponível — PDET fora do ar, testado)",
        passos: [
          "Consultar 4 tabelas da PNAD Contínua, nível município: estoque de trabalhadores por grupamento ocupacional (tabela 5435), rendimento médio do mesmo grupamento (5444), taxa de desocupação (4099) e força de trabalho/PEA (4093).",
          "Grupamento-proxy: \"operadores de instalações e máquinas\" (33377, proxy motorista/armazém) + \"vendedores dos comércios e mercados\" (33374, proxy vendedor) — mais largo que CBO exata, mas é a única fonte que responde de fato.",
          "score_estoque = min-max direto de (estoque ÷ PEA da cidade).",
          "score_custo = min-max invertido do rendimento médio (menor salário = nota melhor, custo de contratação menor).",
          "score_desemprego = min-max direto da taxa de desocupação (mais desemprego = mais gente disponível = mais fácil contratar).",
          "nota_4.3 = média dos 3 scores.",
        ],
        formula: "nota_4.3 = média(score_estoque, score_custo_invertido, score_desemprego)",
        armadilhas: [
          "PNAD Contínua só cobre bem capitais e grandes cidades — testado com município pequeno, retornou vazio.",
          "Mede grupamento ocupacional bem mais largo que \"motorista de caminhão\" especificamente.",
        ],
        notaFormula: "nota 4.3 = média(score_estoque, score_custo invertido, score_desemprego)",
        resultado: "Porto Alegre lidera (bom estoque relativo, salário mais baixo, desemprego alto = mais fácil contratar); Goiânia fica em último (mercado de trabalho historicamente apertado).",
        aoVivo: true,
      },
      {
        id: "c4-4",
        titulo: "4.4 — Concorrência",
        pergunta: "Quanto espaço de mercado sobra por concorrente já instalado nessa cidade?",
        fonteInterna: "Reaproveita o SAM (1.1) — nenhum cálculo novo",
        fonteExterna: "IBGE CEMPRE/SIDRA (mesma contagem de atacadistas do rateio do TAM) + pesquisa dirigida (concorrentes B2B digitais nacionais)",
        passos: [
          "Camada física (automatizável): reaproveitar o nº de atacadistas por cidade (CNAE divisão 46, mesmo denominador do rateio do TAM em 1.1a) — nenhuma consulta nova ao CEMPRE.",
          "Mercado_disponível_por_concorrente = SAM_cidade ÷ nº de atacadistas físicos da cidade.",
          "nota (camada física) = min-max direto (mais mercado por concorrente = melhor).",
          "Camada digital (pesquisa dirigida, não automatizável): identificar por nome os distribuidores B2B digitais de foodservice relevantes no Brasil (Fornece Já, Estoca Fácil, MercadoChef, DistribuiOnline, Abastece B2B, GiroFood) e checar sinais de presença real em cada cidade candidata (site/app, vaga geolocalizada, notícia de expansão, review).",
          "Classificar cada par (concorrente, cidade): confirmado / indício fraco / não encontrado.",
        ],
        formula: "Mercado_disponível_por_concorrente = SAM_sede ÷ concorrentes_físicos_cidade",
        armadilhas: [
          "Concorrência via CNAE é ampla demais — conta qualquer atacadista de alimentos registrado, não filtra por quem de fato compete no nicho B2B digital da Novara. Superestima concorrência física real.",
          "Ausência de sinal digital não é prova definitiva de ausência de concorrente — é evidência moderada, não confirmação.",
          "A camada digital não escala pra qualquer cidade automaticamente — é pesquisa manual, diferente do resto do projeto.",
        ],
        notaFormula: "nota 4.4 = min-max direto (mais mercado por concorrente = melhor) — camada física; a digital entra como texto qualitativo, não altera o score numérico se nenhum concorrente for confirmado",
        resultado: "Goiânia lidera (SAM alto com poucos concorrentes registrados); Campinas tem o pior resultado (quase o triplo de atacadistas registrados de qualquer outra candidata). Nenhuma concorrência digital confirmada em nenhuma das 4 — \"oceano azul\" digital.",
        aoVivo: true,
      },
    ],
  },
  {
    id: "criterio-5",
    numero: "5",
    titulo: "Aderência à Estratégia Interna",
    pergunta:
      "Mesmo vencendo nos Critérios 1–4, a cidade empurra a Novara na direção que a própria liderança já decidiu seguir? Filtro/desempate qualitativo — não entra no VPL.",
    subcriterios: [
      {
        id: "c5-1",
        titulo: "Scorecard de aderência",
        pergunta: "A escolha da cidade é coerente com o que os próprios fundadores já sinalizaram publicamente querer fazer?",
        fonteExterna: "Pesquisa dirigida sobre a própria Novara (pesquisa dirigida) — imprensa, bases de VC, bases de CNPJ",
        passos: [
          "Levantar os fatos-base da estratégia real: discurso público dos fundadores (\"3º mercado no Sul\", CAPEX ~R$15mi/CD, priorizando mercados menores/menos competitivos antes de escalar); toda a expansão histórica foi Sul contíguo (PR→SC→RS→SP, sempre adjacente); nenhuma das 4 candidatas aparece em plano público já anunciado.",
          "O método real (definitivo) é o mesmo mecanismo do 4.2: scorecard 1–10 respondido individualmente pelos diretores responsáveis pela estratégia, sem ver a resposta um do outro antes.",
          "Enquanto isso não chega: proxy de diretor com 5 subperguntas ligadas direto aos fatos públicos, cada uma pontuada 1–10 (1 = nenhuma aderência; 10 = aderência clara) — 1. Sul/roadmap sinalizado; 2. malha logística contígua; 3. porte compatível com \"mercado menor\"; 4. cabeça-de-ponte regional; 5. concorrente-alvo/mercado-vitrine.",
          "Nota final (proxy) = média das 5 subperguntas.",
        ],
        formula: "nota_5_proxy = média(subpergunta₁, ..., subpergunta₅)",
        armadilhas: [
          "É proxy, não resposta real da diretoria — a diretoria pode ter informação privada (negociação em andamento) que não está em nenhuma fonte pesquisável. Substituir, não combinar, quando a resposta real chegar.",
          "Correlação esperada com 4.2 — os dois proxies usam sinais parecidos (distância, região) por natureza, então o mesmo padrão de \"Uberlândia/Porto Alegre favorecidos\" tende a se repetir nos dois. Não é erro, é o mesmo fato estrutural (adjacência ao Sul) visto por duas lentes.",
          "A tese \"3º mercado no Sul\" veio de uma única matéria de imprensa com declaração dos fundadores — a melhor fonte pública disponível, mas uma declaração de intenção, não um documento estratégico formal.",
        ],
        notaFormula: "nota Critério 5 = média das 5 subperguntas (proxy) — substituída pela nota real da diretoria quando ela chegar",
        resultado: "Uberlândia bate quase ponto a ponto com a tese pública dos fundadores (8,8); Porto Alegre é Sul mas grande e disputada, bate parcial (6,0); Campinas e Goiânia ficam mal em quase tudo (1,6 e 1,8).",
        aoVivo: false,
      },
    ],
  },
];

export interface Cenario {
  nome: string;
  pesos: { criterio: string; peso: string }[];
  leitura: string;
}

export const CENARIOS: Cenario[] = [
  {
    nome: "Base (neutro)",
    pesos: [
      { criterio: "1. Mercado", peso: "20%" },
      { criterio: "2. Operação", peso: "20%" },
      { criterio: "3. Abastecimento", peso: "20%" },
      { criterio: "4. Risco", peso: "20%" },
      { criterio: "5. Aderência", peso: "20%" },
    ],
    leitura: "Pesos neutros, sem viés declarado — a leitura de consenso da equipe, o ponto de partida antes de testar qualquer prioridade.",
  },
  {
    nome: "Crescimento + Operacional",
    pesos: [
      { criterio: "1. Mercado", peso: "25%" },
      { criterio: "2. Operação", peso: "25%" },
      { criterio: "3. Abastecimento", peso: "20%" },
      { criterio: "4. Risco", peso: "15%" },
      { criterio: "5. Aderência", peso: "15%" },
    ],
    leitura: "Prioriza os 3 critérios que geram R$ direto (Mercado, Operação, Abastecimento) — a leitura de quem quer crescer rápido, aceitando mais risco.",
  },
  {
    nome: "Conservador ajustado",
    pesos: [
      { criterio: "1. Mercado", peso: "25%" },
      { criterio: "2. Operação", peso: "15%" },
      { criterio: "3. Abastecimento", peso: "10%" },
      { criterio: "4. Risco", peso: "35%" },
      { criterio: "5. Aderência", peso: "15%" },
    ],
    leitura: "Dobra o peso de Risco/Concorrência frente ao Base — o critério com o haircut mais direto sobre o VPL. A leitura de quem prioriza execução segura.",
  },
  {
    nome: "Foco na Estratégia Interna",
    pesos: [
      { criterio: "1. Mercado", peso: "18%" },
      { criterio: "2. Operação", peso: "15%" },
      { criterio: "3. Abastecimento", peso: "12%" },
      { criterio: "4. Risco", peso: "15%" },
      { criterio: "5. Aderência", peso: "40%" },
    ],
    leitura: "Prioriza a Aderência (Critério 5) — testa a recomendação sob a ótica de \"o que os fundadores já sinalizaram querer\", não só o retorno financeiro projetado.",
  },
];

export const NOTA_POR_CRITERIO: { criterio: string; salvador: string; bh: string; brasilia: string; natal: string }[] = [
  { criterio: "1. Mercado", salvador: "4,47", bh: "8,93", brasilia: "8,42", natal: "0,61" },
  { criterio: "2. Operação", salvador: "4,75", bh: "3,32", brasilia: "7,50", natal: "2,89" },
  { criterio: "3. Abastecimento", salvador: "5,18", bh: "10,00", brasilia: "7,89", natal: "0,00" },
  { criterio: "4. Risco/Concorrência", salvador: "6,44", bh: "1,00", brasilia: "2,75", natal: "8,27" },
  { criterio: "5. Aderência Estratégica", salvador: "6,00", bh: "1,60", brasilia: "1,80", natal: "8,80" },
];

export const RESULTADO_POR_CENARIO: { cidade: string; base: string; crescOperacional: string; conservador: string; foco: string }[] = [
  { cidade: "Porto Alegre (RS)", base: "5,37", crescOperacional: "5,21", conservador: "5,50 ★", foco: "5,50 ★" },
  { cidade: "Campinas (SP)", base: "4,97", crescOperacional: "5,45", conservador: "4,32", foco: "4,10" },
  { cidade: "Goiânia (GO)", base: "5,67 ★", crescOperacional: "6,24 ★", conservador: "5,25", foco: "4,72" },
  { cidade: "Uberlândia (MG)", base: "4,11", crescOperacional: "3,44", conservador: "4,80", foco: "5,30" },
];

-- ============================================================================
-- Base interna da Novara em Postgres.
--
-- Duas tabelas cruas, no grão original do CSV — de propósito. O agregado que
-- alimenta o dashboard hoje (src/lib/novara/facts.ts) só responde os cortes que
-- foram pré-calculados; com a base crua aqui, qualquer cruzamento novo vira um
-- GROUP BY, sem depender de regerar arquivo.
--
-- Nomes de coluna preservam o CSV original (net_revenue, cogs, ...) porque
-- todo explicador do app já cita essas colunas pelo nome.
-- ==========================================================================*/

-- ---------------------------------------------------------------- dimensão CEP
create table if not exists public.cep_geo (
  cep           text primary key,
  latitude      double precision,
  longitude     double precision,
  city_api      text,
  state_api     text,
  neighborhood  text,
  status        text not null
);

comment on table public.cep_geo is
  'Geocodificação por CEP (BrasilAPI). status=ok em 7.068 dos 7.125 CEPs. '
  'A coordenada resolve no nível de bairro, não do logradouro.';

-- ------------------------------------------------------------------ fato venda
create table if not exists public.sales (
  id                bigint generated always as identity primary key,
  month             date not null,
  customer_category text,
  region            text not null,
  city              text not null,
  city_norm         text not null,
  cep               text not null,
  product_category  text,
  temperature       text not null,
  weight_kg         numeric(14,3) not null,
  gross_revenue     numeric(14,2) not null,
  net_revenue       numeric(14,2) not null,
  cogs              numeric(14,2) not null,
  gross_profit      numeric(14,2) not null
);

comment on table public.sales is
  'Venda agregada por mês × cliente × cidade × CEP × produto × temperatura — '
  'o grão original do CSV, 382.129 linhas, jan–jul/2026, PE e CE.';
comment on column public.sales.cogs is
  'Custo da mercadoria, NEGATIVO na origem. Lucro bruto = net_revenue + cogs.';
comment on column public.sales.gross_profit is
  'Coluna original do CSV. Arredonda o centavo em 56.090 linhas: para somar, '
  'prefira net_revenue + cogs, que fecha exato.';
comment on column public.sales.city_norm is
  'city sem acento e em caixa alta. É a chave de agrupamento — a base grafa o '
  'mesmo município de formas diferentes (98 rótulos brutos = 82 municípios).';

create index if not exists sales_month_idx     on public.sales (month);
create index if not exists sales_region_idx    on public.sales (region);
create index if not exists sales_city_idx      on public.sales (city_norm);
create index if not exists sales_customer_idx  on public.sales (customer_category);
create index if not exists sales_product_idx   on public.sales (product_category);
create index if not exists sales_cep_idx       on public.sales (cep);

-- ------------------------------------------------------------------------ RLS
-- Obrigatório: a tabela vive no schema public, que é exposto pela Data API.
alter table public.sales   enable row level security;
alter table public.cep_geo enable row level security;

import { createFileRoute } from "@tanstack/react-router";

import { AnchorFigure } from "@/components/novara/AnchorFigure";
import { ChipList } from "@/components/novara/ChipList";
import { DataTable } from "@/components/novara/DataTable";
import { PageHeader } from "@/components/novara/PageHeader";
import { RankBars } from "@/components/novara/RankBars";
import { Section } from "@/components/novara/Section";
import { SplitBar } from "@/components/novara/SplitBar";
import {
  EXPLAIN,
  MARGIN_HEADERS,
  PRODUCT_CATEGORIES,
  PRODUCT_HEADERS,
  TEMPERATURE_HEADERS,
  fmtPct,
  marginExtremes,
  meatShare,
  productTable,
  temperatureSplit,
  temperatureTable,
  topProducts,
} from "@/lib/novara/engine";

export const Route = createFileRoute("/mix")({
  head: () => ({
    meta: [
      { title: "Mix e produto · Base interna Novara" },
      {
        name: "description",
        content:
          "O que a Novara vende: categorias de produto por receita e margem, e a divisão entre cadeia seca e refrigerada que dimensiona o centro de distribuição.",
      },
      { property: "og:title", content: "Mix e produto · Base interna Novara" },
      {
        property: "og:description",
        content: "Categorias de produto, margem por categoria e o peso do refrigerado.",
      },
    ],
  }),
  component: Mix,
});

function Mix() {
  const extremes = marginExtremes();
  const meat = meatShare();
  const top = topProducts(1)[0]!;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Mix e produto"
        subtitle="O que sai do centro de distribuição. Esta é a página que liga o comercial à operação: o mix de temperatura define câmara fria, e o mix de categoria define se o faturamento vira margem."
      />

      <AnchorFigure
        value={top.value}
        caption={`categoria de produto que mais fatura: ${top.label}`}
        scope={`${top.share} da receita líquida, entre ${PRODUCT_CATEGORIES.length} categorias no mix.`}
      />

      <Section
        title="Seco e refrigerado"
        description="A cadeia refrigerada é minoria em peso e quase metade da receita. É também a de menor margem — e a que encarece o CD."
        explain={EXPLAIN.temperature}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.4fr]">
          <SplitBar
            title="receita por cadeia"
            hint="duas praças somadas"
            parts={temperatureSplit()}
            explain={EXPLAIN.temperature}
          />
          <DataTable headers={TEMPERATURE_HEADERS} rows={temperatureTable()} />
        </div>
      </Section>

      <Section title="Categorias que mais faturam" explain={EXPLAIN.products}>
        <RankBars
          title="categorias de produto"
          hint="participação na receita líquida total"
          items={topProducts(10)}
          explain={EXPLAIN.products}
        />
      </Section>

      <Section
        title="Faturamento não é margem"
        description="As mesmas categorias, agora com a margem que cada uma entrega e o preço médio por quilo."
        explain={EXPLAIN.products}
        footer={`Carnes somam ${fmtPct(meat.share)} da receita com margem de ${fmtPct(meat.margin)}. É volume de tráfego: puxa pedido e ocupa caminhão, mas o lucro vem de outro lugar.`}
        emphasis="quiet"
      >
        <DataTable headers={PRODUCT_HEADERS} rows={productTable(15)} bars quiet />
      </Section>

      <Section
        title="As duas pontas da margem"
        description="Categorias com mais de R$ 1 milhão de receita, nas duas extremidades."
        explain={EXPLAIN.products}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DataTable
            headers={MARGIN_HEADERS}
            rows={extremes.best}
            caption="maiores margens — mercearia seca, giro alto, ticket baixo"
          />
          <DataTable
            headers={MARGIN_HEADERS}
            rows={extremes.worst}
            caption="menores margens — proteína e bebida, onde o preço é comparado"
          />
        </div>
      </Section>

      <Section
        title="Inventário de categorias de produto"
        description="Todas as categorias registradas na base, ordenadas por receita."
        emphasis="quiet"
      >
        <ChipList title="o que se vende" items={PRODUCT_CATEGORIES} collapsedCount={14} />
      </Section>
    </div>
  );
}

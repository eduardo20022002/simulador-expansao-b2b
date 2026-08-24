import type { ReactNode } from "react";

import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { MetricExplainer, RankItem } from "@/lib/novara/engine";

interface RankBarsProps {
  title: string;
  hint?: string;
  items: RankItem[];
  aside?: ReactNode;
  tone?: "primary" | "accent";
  explain?: MetricExplainer[];
}

const TONE: Record<"primary" | "accent", string> = {
  primary: "var(--color-primary)",
  accent: "var(--color-chart-2)",
};

/** Ranking em barras horizontais. A largura é a fração que vem do mock. */
export function RankBars({ title, hint, items, aside, tone = "primary", explain }: RankBarsProps) {
  return (
    <Panel className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {aside}
          {explain ? <InfoDot label={title} items={explain} /> : null}
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
              <p className="truncate text-sm text-foreground">{item.label}</p>
              <p className="num shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">
                {item.value}
                <span className="ml-2 font-normal text-muted-foreground">{item.share}</span>
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.fraction * 100}%`,
                  backgroundColor: TONE[tone],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

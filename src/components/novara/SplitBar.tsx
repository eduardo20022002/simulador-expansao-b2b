import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { MetricExplainer, SplitPart } from "@/lib/novara/engine";

interface SplitBarProps {
  title: string;
  hint?: string;
  parts: SplitPart[];
  explain?: MetricExplainer[];
}

/** Barra de composição 100%: como uma receita se reparte entre poucas fatias. */
export function SplitBar({ title, hint, parts, explain }: SplitBarProps) {
  return (
    <Panel className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {explain ? <InfoDot label={title} items={explain} /> : null}
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-sunken">
        {parts.map((p) => (
          <div
            key={p.key}
            style={{ width: `${(p.fraction * 100).toFixed(3)}%`, backgroundColor: p.color }}
            aria-hidden
          />
        ))}
      </div>

      <dl className="flex flex-col gap-2.5">
        {parts.map((p) => (
          <div key={p.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-2.5">
            <span className="size-2.5 translate-y-px rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
            <dt className="truncate text-sm text-foreground">{p.label}</dt>
            <dd className="num shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">
              {p.share}
              <span className="ml-2 font-normal text-muted-foreground">{p.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

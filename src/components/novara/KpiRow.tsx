import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { Kpi } from "@/lib/novara/engine";

/** Linha de KPIs do topo do dashboard. Cada número traz o próprio "i". */
export function KpiRow({ items }: { items: Kpi[] }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Panel key={item.key} className="flex flex-col gap-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <dt className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </dt>
            <InfoDot label={item.label} items={item.explain} />
          </div>
          <dd className="num truncate text-2xl font-semibold leading-none tracking-tight text-foreground">
            {item.value}
          </dd>
          {item.trend ? (
            <p className="num w-fit max-w-full truncate rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {item.trend}
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">{item.caption}</p>
        </Panel>
      ))}
    </dl>
  );
}

import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { Coverage } from "@/lib/novara/engine";

/** Contadores de cobertura da base, cada um com o próprio "i". */
export function CoverageGrid({ items }: { items: Coverage[] }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Panel key={item.label} className="flex flex-col gap-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <dt className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </dt>
            <InfoDot label={item.label} items={item.explain} />
          </div>
          <dd className="num truncate text-xl font-semibold leading-tight text-foreground">
            {item.value}
          </dd>
          <p className="text-xs leading-relaxed text-muted-foreground">{item.caption}</p>
        </Panel>
      ))}
    </dl>
  );
}

import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { RegionStat } from "@/lib/novara/engine";

/** Comparativo das duas praças com barra de participação. */
export function RegionCards({ items }: { items: RegionStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {items.map((region) => (
        <Panel key={region.uf} className="flex flex-col gap-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground">
                {region.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{region.cities}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="num rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-xs text-muted-foreground">
                {region.uf}
              </span>
              <InfoDot label={region.name} items={region.explain} />
            </div>
          </div>

          <div>
            <p className="num truncate text-2xl font-semibold leading-none tracking-tight text-foreground">
              {region.revenue}
            </p>
            <p className="num mt-2 text-xs text-muted-foreground">{region.share}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${region.fraction * 100}%` }}
              />
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                lucro bruto
              </dt>
              <dd className="num mt-1 truncate text-sm font-semibold text-foreground">
                {region.profit}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                margem
              </dt>
              <dd className="num mt-1 text-sm font-semibold text-foreground">
                {region.margin}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                volume
              </dt>
              <dd className="num mt-1 text-sm font-semibold text-foreground">
                {region.volume}
              </dd>
            </div>
          </dl>

          <p className="text-xs leading-relaxed text-muted-foreground">{region.caption}</p>
        </Panel>
      ))}
    </div>
  );
}

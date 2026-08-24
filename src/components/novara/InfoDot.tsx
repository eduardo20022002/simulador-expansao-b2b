import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MetricExplainer } from "@/lib/novara/engine";

interface InfoDotProps {
  label: string;
  items: MetricExplainer[];
}

/**
 * "i" de informação ao lado de um número. Mostra como aquela métrica é
 * calculada. Não deriva nada: recebe pares já escritos pelo engine.
 */
export function InfoDot({ label, items }: InfoDotProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Como ${label} é calculado`}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(21rem,calc(100vw-2.5rem))] p-0">
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            como é calculado
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{label}</p>
        </div>
        <dl className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.metric} className="px-4 py-2.5">
              <dt className="text-xs font-semibold text-foreground">{item.metric}</dt>
              <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.computedFrom}
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

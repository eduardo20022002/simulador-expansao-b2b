import { HelpCircle } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MetricExplainer } from "@/lib/novara/engine";

interface ExplainerProps {
  items: MetricExplainer[];
  label?: string;
}

/**
 * Popover "como este número é calculado". Recebe pares métrica → origem,
 * nunca calcula nada.
 */
export function Explainer({ items, label = "como este número é calculado" }: ExplainerProps) {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <HelpCircle className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">cálculo</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2.5rem))] p-0">
        <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <dl className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.metric} className="px-4 py-3">
              <dt className="text-sm font-semibold text-foreground">{item.metric}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.computedFrom}
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { CascadeStep } from "@/lib/novara/engine";

const TONE_FILL: Record<CascadeStep["tone"], string> = {
  neutral: "var(--color-chart-2)",
  discount: "var(--color-lost)",
  cost: "var(--color-pending)",
  profit: "var(--color-primary)",
};

/**
 * Cascata horizontal. A largura de cada barra é exatamente a fração da receita
 * bruta do passo, e as saídas começam onde o remanescente termina.
 * O percentual fica na coluna de valores, nunca sobre a barra.
 */
export function Cascade({ steps }: { steps: CascadeStep[] }) {
  return (
    <Panel className="p-0">
      <ul className="divide-y divide-border">
        {steps.map((step) => {
          const left = step.from * 100;
          const width = (step.to - step.from) * 100;
          const outflow = step.kind === "outflow";
          return (
            <li
              key={step.key}
              className="grid grid-cols-1 gap-x-5 gap-y-2.5 px-5 py-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,9rem)] sm:items-center"
            >
              <div className="flex items-start justify-between gap-3 sm:block">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-foreground">{step.label}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {outflow ? "saída" : "total"}
                  </p>
                </div>
                <div className="sm:hidden">
                  <InfoDot label={step.label} items={step.explain} />
                </div>
              </div>

              <div className="min-w-0">
                <div className="relative h-8 w-full overflow-hidden rounded-md border border-border bg-surface-sunken">
                  <div
                    className="absolute inset-y-0"
                    style={{
                      left: `${left.toFixed(3)}%`,
                      width: `${width.toFixed(3)}%`,
                      backgroundColor: TONE_FILL[step.tone],
                      opacity: outflow ? 1 : 0.9,
                    }}
                    aria-hidden
                  />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.note}</p>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="num text-base font-semibold leading-tight text-foreground">
                    {step.value}
                  </p>
                  <p className="num mt-0.5 text-xs text-muted-foreground">{step.share}</p>
                </div>
                <div className="hidden sm:block">
                  <InfoDot label={step.label} items={step.explain} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

import type { ReactNode } from "react";

import { Explainer } from "@/components/rf/Explainer";
import type { MetricExplainer } from "@/lib/novara/engine";
import { cn } from "@/lib/utils";

interface BlockProps {
  index: string;
  title: string;
  description?: string;
  explain: MetricExplainer[];
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Casca padrão de bloco: numeração, título, Explainer e espaçamento. */
export function Block({
  index,
  title,
  description,
  explain,
  children,
  footer,
  className,
}: BlockProps) {
  return (
    <section className={cn("flex flex-col gap-6", className)} aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="num text-xs uppercase tracking-[0.18em] text-muted-foreground">
            bloco {index}
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <Explainer items={explain} />
      </div>
      {children}
      {footer ? (
        <p className="max-w-4xl border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
          {footer}
        </p>
      ) : null}
    </section>
  );
}

export function Panel({
  children,
  className,
  quiet = false,
}: {
  children: ReactNode;
  className?: string;
  /** Moldura mais leve, para conteúdo da camada de detalhe. */
  quiet?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        // Classes ramificadas de propósito: `shadow-panel` é utilitário gerado
        // pelo tema, e o tailwind-merge padrão não o reconhece como do mesmo
        // grupo de `shadow-none` — passar os dois deixaria a sombra aplicada.
        quiet ? "border-border/60 bg-card" : "border-border bg-card shadow-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";

import { Explainer } from "@/components/rf/Explainer";
import type { MetricExplainer } from "@/lib/novara/engine";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  description?: string;
  explain?: MetricExplainer[];
  /** Ausente para seções só-texto (descrição + footer, sem tabela/gráfico). */
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /**
   * Tonalidade da seção. "quiet" rebaixa o título para a camada de detalhe —
   * o número-herói e as seções "default" ficam com o peso visual da página.
   * Omitir mantém exatamente a aparência de antes.
   */
  emphasis?: "default" | "quiet";
}

/** Seção de dashboard: título compacto, Explainer opcional e conteúdo. */
export function Section({
  title,
  description,
  explain,
  children,
  footer,
  className,
  emphasis = "default",
}: SectionProps) {
  const quiet = emphasis === "quiet";
  return (
    <section
      className={cn("flex flex-col", quiet ? "gap-3" : "gap-4", className)}
      aria-label={title}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2
            className={cn(
              "font-semibold tracking-tight",
              quiet ? "text-sm text-muted-foreground" : "text-lg text-foreground",
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {explain ? <Explainer items={explain} /> : null}
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

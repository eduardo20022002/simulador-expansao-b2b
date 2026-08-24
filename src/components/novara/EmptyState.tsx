import type { ReactNode } from "react";

import { Panel } from "./Block";

interface EmptyStateProps {
  title: string;
  description: string;
  /** O que vai entrar aqui quando a coleta externa acontecer. */
  planned: string[];
  sources?: string[];
  children?: ReactNode;
}

/**
 * Estado vazio honesto: diz o que ainda não existe e o que está planejado,
 * em vez de mostrar número inventado.
 */
export function EmptyState({ title, description, planned, sources, children }: EmptyStateProps) {
  return (
    <Panel className="flex flex-col gap-5 border-dashed">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          ainda sem dado
        </p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            o que entra aqui
          </p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {planned.map((p) => (
              <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {sources ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              fontes previstas
            </p>
            <ul className="mt-2.5 flex flex-col gap-2">
              {sources.map((s) => (
                <li key={s} className="text-sm leading-relaxed text-muted-foreground">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {children}
    </Panel>
  );
}

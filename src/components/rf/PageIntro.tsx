import type { ReactNode } from "react";

interface PageIntroProps {
  title: string;
  subtitle: string;
  aside?: ReactNode;
  children?: ReactNode;
}

/** Cabeçalho de página: título de marca, subtítulo e slot de conteúdo. */
export function PageIntro({ title, subtitle, aside, children }: PageIntroProps) {
  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="brand-gradient-text text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        {aside}
      </div>
      {children}
    </header>
  );
}

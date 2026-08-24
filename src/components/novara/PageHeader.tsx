interface PageHeaderProps {
  title: string;
  subtitle: string;
}

/** Cabeçalho de página do dashboard. */
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header>
      <h1 className="brand-gradient-text text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {subtitle}
      </p>
    </header>
  );
}

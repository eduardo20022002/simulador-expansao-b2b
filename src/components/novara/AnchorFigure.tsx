interface AnchorFigureProps {
  value: string;
  caption: string;
  scope: string;
}

/**
 * Número âncora da página. É o maior tipo da tela, mas dimensionado para
 * liderar a hierarquia sem dominá-la: os cartões de apoio ficam em text-2xl,
 * então ~40px já cria a diferença de camada sem virar cartaz.
 */
export function AnchorFigure({ value, caption, scope }: AnchorFigureProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="num text-3xl font-semibold leading-none tracking-tight text-foreground sm:text-4xl">
        {value}
      </p>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{caption}</p>
      <p className="max-w-2xl text-sm leading-relaxed text-foreground">{scope}</p>
    </div>
  );
}

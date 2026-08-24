import { useState } from "react";

import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { MetricExplainer, Series } from "@/lib/novara/engine";

interface LineChartProps {
  title: string;
  hint?: string;
  series: Series[];
  unit?: string;
  legend?: string;
  /** Força o eixo a começar em zero. Padrão: sim. */
  zeroBased?: boolean;
  /** Formatador das marcações do eixo. Vem do engine — o gráfico não formata. */
  fmtTick?: (n: number) => string;
  explain?: MetricExplainer[];
}

const W = 720;
const H = 205;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 16;
const AXIS_Y = H - 26;

/**
 * Linhas por praça ao longo dos meses. SVG à mão, sem biblioteca de chart.
 * Passar o mouse sobre uma coluna revela os valores daquele mês; os pontos e
 * rótulos já vêm formatados do engine.
 */
export function LineChart({
  title,
  hint,
  series,
  unit,
  legend,
  zeroBased = true,
  fmtTick = (n) => String(Math.round(n)),
  explain,
}: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const all = series.flatMap((s) => s.points.map((p) => p.value));
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const range = rawMax - rawMin || 1;
  // Folga no topo para o rótulo de ponta não colidir com a linha de grade.
  const min = zeroBased ? 0 : rawMin - range * 0.2;
  const max = zeroBased ? rawMax * 1.12 : rawMax + range * 0.2;
  const span = max - min || 1;

  const labels = series[0]!.points.map((p) => p.label);
  const stepX = (W - PAD_L - PAD_R) / Math.max(1, labels.length - 1);
  const x = (i: number) => PAD_L + i * stepX;
  const y = (v: number) => PAD_T + (AXIS_Y - PAD_T) * (1 - (v - min) / span);
  const ticks = [0, 0.5, 1].map((t) => min + span * t);

  // Posição do balão em % da largura, para o CSS acompanhar o SVG responsivo.
  const hoverLeft = hover === null ? 0 : (x(hover) / W) * 100;
  const flip = hoverLeft > 62;

  return (
    <Panel className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ul className="flex flex-wrap items-center gap-3">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                {s.label}
              </li>
            ))}
          </ul>
          {explain ? <InfoDot label={title} items={explain} /> : null}
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          className="h-auto w-full touch-none"
          aria-label={`${title}. ${series
            .map((s) => `${s.label}: ${s.points.map((p) => `${p.label} ${p.display}`).join(", ")}`)
            .join(". ")}`}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
              <text
                x={PAD_L - 8}
                y={y(t) + 4}
                textAnchor="end"
                fontSize={10}
                fontFamily="var(--font-mono)"
                fill="var(--color-muted-foreground)"
              >
                {fmtTick(t)}
              </text>
            </g>
          ))}

          {hover !== null ? (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD_T}
              y2={AXIS_Y}
              stroke="var(--color-primary)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ) : null}

          {series.map((s) => {
            const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
            return (
              <g key={s.key}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" />
                {s.points.map((p, i) => (
                  <circle
                    key={p.label}
                    cx={x(i)}
                    cy={y(p.value)}
                    r={hover === i ? 5 : 3}
                    fill={s.color}
                    stroke="var(--color-card)"
                    strokeWidth={hover === i ? 2 : 0}
                  />
                ))}
              </g>
            );
          })}

          {labels.map((l, i) => (
            <text
              key={l}
              x={x(i)}
              y={AXIS_Y + 16}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill={hover === i ? "var(--color-foreground)" : "var(--color-muted-foreground)"}
            >
              {l}
            </text>
          ))}

          {/* Faixas invisíveis de captura: uma por mês, cobrindo toda a altura. */}
          {labels.map((l, i) => (
            <rect
              key={`hit-${l}`}
              x={x(i) - stepX / 2}
              y={0}
              width={stepX}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
              role="button"
              aria-label={`${l}: ${series.map((s) => `${s.label} ${s.points[i]!.display}`).join(", ")}`}
            />
          ))}
        </svg>

        {hover !== null ? (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-[8.5rem] rounded-lg border border-border bg-card px-3 py-2 shadow-panel"
            style={
              flip
                ? { right: `${(100 - hoverLeft).toFixed(2)}%`, marginRight: "0.5rem" }
                : { left: `${hoverLeft.toFixed(2)}%`, marginLeft: "0.5rem" }
            }
          >
            <p className="num text-xs font-semibold text-foreground">{labels[hover]}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {series.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                    {s.label}
                  </span>
                  <span className="num font-semibold text-foreground">{s.points[hover]!.display}</span>
                </li>
              ))}
            </ul>
            {unit ? <p className="mt-1.5 text-[11px] text-muted-foreground">{unit}</p> : null}
          </div>
        ) : null}
      </div>

      {legend ? <p className="text-sm leading-relaxed text-muted-foreground">{legend}</p> : null}
    </Panel>
  );
}

import { useState } from "react";

import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { MetricExplainer, MonthPoint } from "@/lib/novara/engine";

interface MonthBarsProps {
  title: string;
  points: MonthPoint[];
  legend: string;
  /** Texto da unidade mostrado no balão (ex.: "R$ milhões"). */
  unit?: string;
  explain?: MetricExplainer[];
}

const W = 720;
const H = 180;
const PAD_X = 10;
const PAD_TOP = 16;
const AXIS_Y = H - 24;

/** Barras por mês. SVG à mão; o balão aparece ao passar o mouse na coluna. */
export function MonthBars({ title, points, legend, unit, explain }: MonthBarsProps) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...points.map((p) => p.value));
  const slot = (W - PAD_X * 2) / points.length;
  const barW = slot * 0.54;
  const hoverLeft = hover === null ? 0 : ((PAD_X + hover * slot + slot / 2) / W) * 100;
  const flip = hoverLeft > 62;

  return (
    <Panel className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        {explain ? <InfoDot label={title} items={explain} /> : null}
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${title}: ${points.map((p) => `${p.label} ${p.display}`).join(", ")}`}
          className="h-auto w-full touch-none"
          onMouseLeave={() => setHover(null)}
        >
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={AXIS_Y}
            y2={AXIS_Y}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          {points.map((point, i) => {
            const h = ((AXIS_Y - PAD_TOP) * point.value) / max;
            const x = PAD_X + i * slot + (slot - barW) / 2;
            const y = AXIS_Y - h;
            const on = hover === i;
            return (
              <g key={point.label}>
                <rect
                  x={x}
                  y={PAD_TOP}
                  width={barW}
                  height={AXIS_Y - PAD_TOP}
                  rx={3}
                  fill={on ? "var(--color-surface-sunken)" : "var(--color-rail)"}
                />
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={3}
                  fill={on ? "var(--color-primary)" : "var(--color-chart-1)"}
                  opacity={hover === null || on ? 1 : 0.55}
                />
                <text
                  x={x + barW / 2}
                  y={AXIS_Y + 15}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  fill={on ? "var(--color-foreground)" : "var(--color-muted-foreground)"}
                >
                  {point.label}
                </text>
                <rect
                  x={PAD_X + i * slot}
                  y={0}
                  width={slot}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.label}: ${point.display}`}
                />
              </g>
            );
          })}
        </svg>

        {hover !== null ? (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-border bg-card px-3 py-2 shadow-panel"
            style={
              flip
                ? { right: `${(100 - hoverLeft).toFixed(2)}%`, marginRight: "0.5rem" }
                : { left: `${hoverLeft.toFixed(2)}%`, marginLeft: "0.5rem" }
            }
          >
            <p className="num text-xs font-semibold text-foreground">{points[hover]!.label}</p>
            <p className="num mt-0.5 text-sm font-semibold text-primary">{points[hover]!.display}</p>
            {unit ? <p className="mt-0.5 text-[11px] text-muted-foreground">{unit}</p> : null}
          </div>
        ) : null}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{legend}</p>
    </Panel>
  );
}

"use client";

import { useState } from "react";
import { numero } from "@/lib/format";

type Punto = { x: number; y: number; display: string };

/** Serie singola nel tempo: linea da 2px, area leggera, etichetta sull'ultimo punto, tooltip al passaggio. */
export function LineChart({ punti, label, unita = "numero" }: { punti: Punto[]; label: string; unita?: "euro" | "numero" }) {
  const formatTick = (n: number) => (unita === "euro" ? `${numero(Math.round(n))} €` : numero(Math.round(n)));
  const [attivo, setAttivo] = useState<number | null>(null);
  const W = 640;
  const H = 240;
  const m = { t: 16, r: 56, b: 28, l: 48 };
  const xs = punti.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = niceMax(Math.max(...punti.map((p) => p.y)));
  const sx = (x: number) => m.l + ((x - minX) / Math.max(1, maxX - minX)) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - (y / maxY) * (H - m.t - m.b);
  const ticks = [0, maxY / 2, maxY];
  const path = punti.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const area = `${path} L${sx(maxX)},${sy(0)} L${sx(minX)},${sy(0)} Z`;
  const ultimo = punti.at(-1)!;
  const sel = attivo === null ? null : punti[attivo];
  const passo = (W - m.l - m.r) / Math.max(1, punti.length - 1);

  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerLeave={() => setAttivo(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} />
            <text x={m.l - 8} y={sy(t) + 4} textAnchor="end">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {punti.map((p, i) =>
          i === 0 || i === punti.length - 1 || punti.length <= 8 || i % 2 === 0 ? (
            <text key={p.x} x={sx(p.x)} y={H - 8} textAnchor="middle">
              {p.x}
            </text>
          ) : null,
        )}
        <path className="area" d={area} />
        <path className="line" d={path} />
        <circle className="dot" cx={sx(ultimo.x)} cy={sy(ultimo.y)} r={5} />
        <text className="label" x={sx(ultimo.x) + 9} y={sy(ultimo.y) + 4}>
          {ultimo.display}
        </text>
        {sel && (
          <>
            <line className="grid" x1={sx(sel.x)} x2={sx(sel.x)} y1={m.t} y2={H - m.b} style={{ stroke: "var(--muted)" }} />
            <circle className="dot" cx={sx(sel.x)} cy={sy(sel.y)} r={5} />
          </>
        )}
        {punti.map((p, i) => (
          <rect
            key={p.x}
            x={sx(p.x) - passo / 2}
            y={m.t}
            width={passo}
            height={H - m.t - m.b}
            fill="transparent"
            onPointerEnter={() => setAttivo(i)}
            onPointerDown={() => setAttivo(i)}
          />
        ))}
      </svg>
      <figcaption className="chart-tip" aria-live="polite">
        {sel ? (
          <>
            <strong>{sel.x}</strong>: {sel.display}
          </>
        ) : (
          "Passa sul grafico (o toccalo) per vedere ogni anno."
        )}
      </figcaption>
    </figure>
  );
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

export type Barra = {
  id: string;
  label: React.ReactNode;
  value: number;
  display: string;
  sub?: React.ReactNode;
  /** Valore di riferimento (es. fabbisogno standard), disegnato come tacca. */
  ref?: number;
  alt?: boolean;
  title?: string;
};

/** Barre orizzontali con valore in testa e, opzionale, una tacca di riferimento. */
export function BarList({ items, max, label }: { items: Barra[]; max?: number; label: string }) {
  const top = max ?? Math.max(...items.flatMap((i) => [i.value, i.ref ?? 0]), 1);
  return (
    <ul className="bars" aria-label={label}>
      {items.map((i) => (
        <li key={i.id} className="bar-row" title={i.title}>
          <div className="bar-head">
            <span>{i.label}</span>
            <span className="v num">{i.display}</span>
          </div>
          <div className="bar-track" aria-hidden="true">
            <div className={`bar-fill${i.alt ? " alt" : ""}`} style={{ width: `${Math.max(0, (i.value / top) * 100)}%` }} />
            {i.ref !== undefined && <div className="bar-ref" style={{ left: `calc(${(i.ref / top) * 100}% - 1px)` }} />}
          </div>
          {i.sub && <div className="bar-sub">{i.sub}</div>}
        </li>
      ))}
    </ul>
  );
}

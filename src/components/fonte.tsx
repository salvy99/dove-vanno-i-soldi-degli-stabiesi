import type { Dataset } from "@/lib/dati";

/** Blocco "da dove viene questo numero", da mettere sotto ogni dato. */
export function Fonte({ dataset, avvertenze = true }: { dataset: Dataset; avvertenze?: boolean }) {
  const { fonte } = dataset;
  return (
    <div className="source">
      <p>
        <strong>Fonte:</strong> <a href={fonte.url}>{fonte.ente}</a> · {fonte.periodo} · licenza {fonte.licenza}
      </p>
      {avvertenze && dataset.avvertenze.length > 0 && (
        <ul>
          {dataset.avvertenze.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

/** Pulsanti per condividere una pagina: WhatsApp, Facebook, Telegram, copia link, scarica immagine. */
export function Condividi({ testo, immagine }: { testo: string; immagine: string }) {
  const [copiato, setCopiato] = useState(false);
  const url = () => window.location.href.split("#")[0];
  const apri = (indirizzo: string) => window.open(indirizzo, "_blank", "noopener,noreferrer");

  return (
    <div className="share" role="group" aria-label="Condividi">
      <button type="button" onClick={() => apri(`https://wa.me/?text=${encodeURIComponent(`${testo}\n${url()}`)}`)}>
        WhatsApp
      </button>
      <button type="button" onClick={() => apri(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)}>
        Facebook
      </button>
      <button type="button" onClick={() => apri(`https://t.me/share/url?url=${encodeURIComponent(url())}&text=${encodeURIComponent(testo)}`)}>
        Telegram
      </button>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopiato(true);
            setTimeout(() => setCopiato(false), 2500);
          } catch {
            window.prompt("Copia il link:", url());
          }
        }}
      >
        {copiato ? "Link copiato ✓" : "Copia link"}
      </button>
      <a className="button" href={immagine} download>
        Scarica l&apos;immagine
      </a>
    </div>
  );
}

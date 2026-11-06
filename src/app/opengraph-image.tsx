import { ImageResponse } from "next/og";
import { scontrino } from "@/lib/dati";
import { euro } from "@/lib/format";

export const alt = "Dove vanno i soldi degli stabiesi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Anteprima del sito quando si condivide la pagina iniziale.
export default function Image() {
  const s = scontrino();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b2a5e", padding: 64, color: "#ffffff" }}>
        <div style={{ display: "flex", fontSize: 26, color: "#ffd100", fontWeight: 700, letterSpacing: 2 }}>CASTELLAMMARE DI STABIA · DATI PUBBLICI UFFICIALI</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Dove vanno i soldi che versi?</div>
          <div style={{ display: "flex", fontSize: 34, color: "#c9d6f2", marginTop: 24 }}>
            {`Il Comune spende ${euro(s.totale)} per ogni stabiese. Ecco come, voce per voce.`}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#ffd100", fontWeight: 700 }}>Calcolatore · Spesa del Comune · PNRR · Appalti · Cosa non va</div>
      </div>
    ),
    { ...size },
  );
}

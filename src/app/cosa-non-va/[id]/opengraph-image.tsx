import { ImageResponse } from "next/og";
import { segnali } from "@/lib/dati";

export const alt = "Un punto critico dei conti pubblici di Castellammare di Stabia, con fonte";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return segnali.map((s) => ({ id: s.id }));
}

// Scheda da condividere su WhatsApp e social: titolo, dato, confronto, fonte, sito.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = segnali.find((x) => x.id === id);
  if (!s) return new Response("Non trovato", { status: 404 });

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0b2a5e", padding: 56, color: "#ffffff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, color: "#c9d6f2" }}>
          <div style={{ display: "flex", fontWeight: 700, color: "#ffffff" }}>Dove vanno i soldi degli stabiesi</div>
          <div style={{ display: "flex", background: "#ffd100", color: "#0b2a5e", padding: "6px 16px", borderRadius: 999, fontWeight: 700 }}>{`Cosa non va · ${s.area}`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", borderLeft: "8px solid #ffd100", paddingLeft: 36, marginTop: 28 }}>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1 }}>{s.titolo}</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#ffd100", marginTop: 28 }}>{s.dato}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#c9d6f2", marginTop: 10 }}>{s.confronto}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#c9d6f2", marginTop: 24 }}>
          <div style={{ display: "flex" }}>{`Fonte: ${s.fonte}`}</div>
          <div style={{ display: "flex" }}>Un segnale da verificare, non un&apos;accusa</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

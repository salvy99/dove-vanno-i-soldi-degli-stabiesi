// Stima indicativa delle imposte sul reddito 2026 per chi ha il domicilio
// fiscale a Castellammare di Stabia. Non è un calcolo fiscale: ignora oneri
// deducibili, detrazioni per familiari, spese e crediti d'imposta.
//
// Nota: questo file è importato anche dai test con Node (type stripping),
// quindi usa solo sintassi TypeScript cancellabile e import relativi.

import {
  ADDIZIONALE_COMUNALE,
  ADDIZIONALE_REGIONALE_SCAGLIONI,
  COMPONENTI_ARERA,
  IMU,
  IRPEF_SCAGLIONI,
  TARI_DOMESTICA,
  TEFA,
  type Scaglione,
} from "./regole-fiscali-2026.ts";

export type TipoReddito = "dipendente" | "pensionato" | "autonomo";

export type StimaImposte = {
  reddito: number;
  irpefLorda: number;
  detrazioni: number;
  stato: number;
  regione: number;
  comune: number;
  totale: number;
};

const arrotonda = (n: number) => Math.round(n * 100) / 100;

export function impostaPerScaglioni(reddito: number, scaglioni: readonly Scaglione[]): number {
  let imposta = 0;
  let base = 0;
  for (const { fino, aliquota } of scaglioni) {
    const tetto = fino ?? Number.POSITIVE_INFINITY;
    if (reddito <= base) break;
    imposta += (Math.min(reddito, tetto) - base) * aliquota;
    base = tetto;
  }
  return imposta;
}

// Art. 13 TUIR (detrazioni base per tipo di reddito).
function detrazioneBase(r: number, tipo: TipoReddito): number {
  if (tipo === "dipendente") {
    let d = 0;
    if (r <= 15000) d = 1955;
    else if (r <= 28000) d = 1910 + (1190 * (28000 - r)) / 13000;
    else if (r <= 50000) d = (1910 * (50000 - r)) / 22000;
    if (r > 25000 && r <= 35000) d += 65;
    return d;
  }
  if (tipo === "pensionato") {
    if (r <= 8500) return 1955;
    if (r <= 28000) return 700 + (1255 * (28000 - r)) / 19500;
    if (r <= 50000) return (700 * (50000 - r)) / 22000;
    return 0;
  }
  if (r <= 5500) return 1265;
  if (r <= 28000) return 500 + (765 * (28000 - r)) / 22500;
  if (r <= 50000) return (500 * (50000 - r)) / 22000;
  return 0;
}

// L. 207/2024: ulteriore detrazione per lavoratori dipendenti tra 20.000 e 40.000 €.
function ulterioreDetrazioneDipendenti(r: number, tipo: TipoReddito): number {
  if (tipo !== "dipendente") return 0;
  if (r > 20000 && r <= 32000) return 1000;
  if (r > 32000 && r <= 40000) return (1000 * (40000 - r)) / 8000;
  return 0;
}

export function stimaImposte({ reddito, tipo }: { reddito: number; tipo: TipoReddito }): StimaImposte {
  const r = Number.isFinite(reddito) && reddito > 0 ? reddito : 0;
  const irpefLorda = impostaPerScaglioni(r, IRPEF_SCAGLIONI);
  const detrazioni = r > 0 ? detrazioneBase(r, tipo) + ulterioreDetrazioneDipendenti(r, tipo) : 0;
  const stato = Math.max(0, irpefLorda - detrazioni);
  // Le addizionali sono dovute solo se, per lo stesso anno, è dovuta l'IRPEF netta.
  const dovute = stato > 0;
  const regione = dovute ? impostaPerScaglioni(r, ADDIZIONALE_REGIONALE_SCAGLIONI) : 0;
  const comune = dovute && r > ADDIZIONALE_COMUNALE.esenzioneFino ? r * ADDIZIONALE_COMUNALE.aliquota : 0;
  return {
    reddito: r,
    irpefLorda: arrotonda(irpefLorda),
    detrazioni: arrotonda(detrazioni),
    stato: arrotonda(stato),
    regione: arrotonda(regione),
    comune: arrotonda(comune),
    totale: arrotonda(stato + regione + comune),
  };
}

export type StimaTari = { tari: number; tefa: number; arera: number; totale: number };

/** TARI 2026 per un'abitazione: m² × quota fissa + quota variabile, più TEFA e componenti ARERA. */
export function stimaTari({ mq, persone }: { mq: number; persone: number }): StimaTari {
  if (!Number.isFinite(mq) || mq <= 0) return { tari: 0, tefa: 0, arera: 0, totale: 0 };
  const n = Math.min(6, Math.max(1, Math.round(Number.isFinite(persone) ? persone : 1)));
  const { fissaMq, variabile } = TARI_DOMESTICA[n];
  const tari = mq * fissaMq + variabile;
  const tefa = tari * TEFA;
  return { tari: arrotonda(tari), tefa: arrotonda(tefa), arera: arrotonda(COMPONENTI_ARERA), totale: arrotonda(tari + tefa + COMPONENTI_ARERA) };
}

export type TipoImmobile = "seconda-casa" | "comodato" | "principale-lusso";

/** IMU 2026 annua per un immobile abitativo, dalla rendita catastale. */
export function stimaImu({ rendita, tipo }: { rendita: number; tipo: TipoImmobile }): number {
  if (!Number.isFinite(rendita) || rendita <= 0) return 0;
  const base = rendita * (1 + IMU.rivalutazioneRendita) * IMU.moltiplicatoreAbitazioni;
  if (tipo === "principale-lusso") return arrotonda(Math.max(0, base * IMU.principaleLusso - IMU.detrazionePrincipale));
  if (tipo === "comodato") return arrotonda(base * (1 - IMU.riduzioneComodato) * IMU.altriFabbricati);
  return arrotonda(base * IMU.altriFabbricati);
}

// Calcoli sui conti di cassa SIOPE, senza dipendenze: usati sia dalle pagine
// sia dallo specchietto "Cosa non va" (e quindi anche dai test con Node).

export type Titolo = { codice: string; voce: string; centesimi: number | null };
export type EnteSiope = { nome: string; popolazione: number; totaleCentesimi: number; perTitolo: Titolo[] };

// Titoli che sono soldi "di passaggio" e non spesa/entrata propria del Comune:
// movimenti da regolarizzare, anticipazioni di tesoreria, partite di giro e conto terzi.
const DI_PASSAGGIO = {
  pagamenti: new Set(["0", "5", "7"]),
  incassi: new Set(["0", "7", "9"]),
} as const;

/** Totale in euro al netto dei soldi di passaggio. */
export function totaleProprio(ente: EnteSiope, tipo: "pagamenti" | "incassi"): number {
  return ente.perTitolo.filter((t) => !DI_PASSAGGIO[tipo].has(t.codice)).reduce((a, t) => a + (t.centesimi ?? 0), 0) / 100;
}

/** Importo in euro di un titolo (es. "1" = tributi negli incassi, spese correnti nei pagamenti). */
export function titolo(ente: EnteSiope, codice: string): number {
  return (ente.perTitolo.find((t) => t.codice === codice)?.centesimi ?? 0) / 100;
}

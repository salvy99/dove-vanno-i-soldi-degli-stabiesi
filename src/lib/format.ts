// Formattazione dei numeri secondo le regole del progetto originale:
// separatore delle migliaia sempre, decimali fissi nella forma compatta,
// e mai un numero al posto di un dato mancante.

const intero = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" });
const dueDecimali = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const unDecimale = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: "always" });

export const NON_DISPONIBILE = "Non disponibile";

// Spazio non separabile tra numero e unità: "10,5 mln €" non va mai a capo a metà.
const NB = "\u00a0";

export function numero(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? NON_DISPONIBILE : intero.format(n);
}

export function euro(n: number | null | undefined, decimali = false): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NON_DISPONIBILE;
  return `${decimali ? dueDecimali.format(n) : intero.format(Math.round(n))}${NB}€`;
}

/** 1,23 mld € · 45,6 mln € · 12.345 € */
export function euroCompatto(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NON_DISPONIBILE;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${dueDecimali.format(n / 1e9)}${NB}mld${NB}€`;
  if (abs >= 1e6) return `${unDecimale.format(n / 1e6)}${NB}mln${NB}€`;
  return euro(n);
}

/** Sempre in milioni con un decimale: per colonne ed elenchi che devono avere una sola unità. */
export function euroMln(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NON_DISPONIBILE;
  return `${unDecimale.format(n / 1e6)}${NB}mln${NB}€`;
}

export const daCentesimi = (c: number | null | undefined): number | null =>
  c === null || c === undefined ? null : c / 100;

/** +130% · −58% · 0% (con il vero segno meno tipografico). */
export function percentualeConSegno(n: number): string {
  const r = Math.round(n);
  if (r === 0) return "0%";
  return `${r > 0 ? "+" : "−"}${intero.format(Math.abs(r))}%`;
}

export function percentuale(n: number, decimali = 0): string {
  const f = decimali === 1 ? unDecimale : intero;
  return `${f.format(n)}%`;
}

const mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const nomeMese = (m: number) => mesi[m - 1] ?? "";

/** "2025-05-30" → "30 maggio 2025"; "13/02/2025" → "13 febbraio 2025". */
export function data(d: string | null | undefined): string {
  if (!d) return NON_DISPONIBILE;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${Number(m[3])} ${nomeMese(Number(m[2]))} ${m[1]}`;
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
  if (m) return `${Number(m[1])} ${nomeMese(Number(m[2]))} ${m[3]}`;
  return d;
}

/** Testo MAIUSCOLO delle fonti → "Testo Leggibile", lasciando sigle brevi in maiuscolo. */
export function leggibile(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/(^|[\s'"(/-])([a-zà-ù])/g, (_, p, c) => p + c.toUpperCase())
    .replace(/\b(S\.?r\.?l\.?|S\.?p\.?a\.?|Spa|Srl|Asl|Pcm|Iic|Ipia|Iti|Mimit|Ic)\b/gi, (x) => x.toUpperCase())
    .replace(/\b(Di|Del|Della|Delle|Dei|Degli|E|Per|In|Con|Da|Al|Alla|Ai)\b/g, (x) => x.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());
}

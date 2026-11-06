// Regole fiscali 2026 usate dal calcolatore. Ogni valore ha la sua fonte
// ufficiale: aggiornarle ogni anno quando escono le nuove delibere.

export type Scaglione = { fino: number | null; aliquota: number };

export const ANNO_FISCALE = 2026;

export const IRPEF_SCAGLIONI: Scaglione[] = [
  { fino: 28000, aliquota: 0.23 },
  { fino: 50000, aliquota: 0.33 },
  { fino: null, aliquota: 0.43 },
];

// Campania 2026: aliquote per scaglione (dati MEF, pubblicati il 29/01/2026).
export const ADDIZIONALE_REGIONALE_SCAGLIONI: Scaglione[] = [
  { fino: 15000, aliquota: 0.0173 },
  { fino: 28000, aliquota: 0.0296 },
  { fino: 50000, aliquota: 0.032 },
  { fino: null, aliquota: 0.0333 },
];

// Castellammare di Stabia 2026: aliquota unica 0,7% con esenzione per redditi
// imponibili fino a 10.000 € (delibera n. 123 del 27/11/2025).
export const ADDIZIONALE_COMUNALE = { aliquota: 0.007, esenzioneFino: 10000 };

// TARI 2026 utenze domestiche (tariffe 2025 confermate, identiche al 2024):
// quota fissa in €/m² e quota variabile in € all'anno per numero di occupanti.
// Deliberazione commissariale con i poteri del Consiglio n. 4 del 30/07/2026, pagg. 8 e 12.
export const TARI_DOMESTICA: Record<number, { fissaMq: number; variabile: number }> = {
  1: { fissaMq: 1.742612, variabile: 99.718706 },
  2: { fissaMq: 2.022291, variabile: 232.67698 },
  3: { fissaMq: 2.1944, variabile: 299.156117 },
  4: { fissaMq: 2.344997, variabile: 365.635255 },
  5: { fissaMq: 2.36651, variabile: 481.973745 },
  6: { fissaMq: 2.280455, variabile: 565.072666 }, // vale da 6 occupanti in su
};
/** Tributo provinciale (TEFA) della Città metropolitana di Napoli, sull'importo TARI. */
export const TEFA = 0.05;
/** Componenti perequative ARERA UR1 + UR2 + UR3, in € all'anno per utenza. */
export const COMPONENTI_ARERA = 0.1 + 1.5 + 6;

// IMU 2026: prospetto aliquote MEF n. 18371 (delibera di Consiglio n. 122 del 27/11/2025).
export const IMU = {
  moltiplicatoreAbitazioni: 160, // categorie A (tranne A/10), C/2, C/6, C/7
  rivalutazioneRendita: 0.05,
  altriFabbricati: 0.0106, // seconde case e altri fabbricati abitativi
  principaleLusso: 0.006, // abitazione principale A/1, A/8, A/9
  detrazionePrincipale: 200, // Regolamento IMU, art. 6 comma 5
  riduzioneComodato: 0.5, // base imponibile ridotta del 50%
};

export const FONTI_FISCALI = [
  {
    voce: "IRPEF nazionale: scaglioni 23% / 33% / 43%",
    riferimento: "Art. 11 TUIR, come modificato dalla Legge di Bilancio 2026 (L. 30 dicembre 2025, n. 199)",
    url: "https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef",
  },
  {
    voce: "Detrazioni per lavoro dipendente, pensione e lavoro autonomo",
    riferimento: "Art. 13 TUIR",
    url: "https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef",
  },
  {
    voce: "Ulteriore detrazione per i lavoratori dipendenti tra 20.000 e 40.000 €",
    riferimento: "Art. 1, commi 4-9, Legge 30 dicembre 2024, n. 207",
    url: "https://www.gazzettaufficiale.it/eli/id/2024/12/31/24G00229/sg",
  },
  {
    voce: "Addizionale regionale Campania 2026",
    riferimento: "MEF · Dipartimento delle Finanze, aliquote applicabili (L.R. Campania 28/12/2021 n. 31 e successive)",
    url: "https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/addregirpef.php?reg=05",
  },
  {
    voce: "Addizionale comunale Castellammare di Stabia 2026",
    riferimento: "MEF · Dipartimento delle Finanze, delibera comunale n. 123 del 27/11/2025",
    url: "https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/risultato.htm?lista=1&r=1&pagina=campania.htm&pr=NA&cc=C129",
  },
  {
    voce: "TARI 2026 utenze domestiche (quota fissa per m² e quota variabile per nucleo)",
    riferimento: "Deliberazione commissariale con i poteri del Consiglio n. 4 del 30/07/2026 (conferma tariffe 2025)",
    url: "https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_at/download_lib.php?key=0900f23080c68ab0&nome=406766_DIMUNIC-04na26c129d.pdf",
  },
  {
    voce: "TEFA 5% della Città metropolitana di Napoli",
    riferimento: "Deliberazione del Sindaco metropolitano n. 308 del 15/10/2025",
    url: "https://www.cittametropolitana.na.it/documents/252551/15509489/jDS308TEFA.pdf/5b7f9a12-22f6-4eef-a186-0783abeedcbe",
  },
  {
    voce: "IMU 2026: 1,06% seconde case, 0,6% abitazione principale di lusso con detrazione di 200 €",
    riferimento: "Prospetto aliquote MEF n. 18371, delibera di Consiglio n. 122 del 27/11/2025; Regolamento IMU 2020",
    url: "https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_imu/download_lib.php?key=0900f23080aef83b&nome=18371_DIMUNIC-04na26c129d.pdf",
  },
] as const;

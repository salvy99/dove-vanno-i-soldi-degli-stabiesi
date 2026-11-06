#!/usr/bin/env node
// Estrae dal repository DoveVannoINostriSoldi solo i dati che riguardano
// Castellammare di Stabia (e un gruppo di Comuni di confronto) e li scrive in
// src/data/castellammare/*.json.
//
// Uso:
//   git clone --depth 1 https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi .cache/upstream
//   UPSTREAM_DIR=.cache/upstream node scripts/estrai-dati.mjs
//
// Lo script non scarica nulla da internet: legge gli snapshot già verificati
// dal progetto originale, che a loro volta riportano fonte ufficiale, data e
// licenza. Gli importi restano in centesimi interi per non perdere precisione.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(import.meta.dirname, "..");
const UPSTREAM = resolve(ROOT, process.env.UPSTREAM_DIR ?? ".cache/upstream");
const GEN = join(UPSTREAM, "src/data/generated");
const OUT = join(ROOT, "src/data/castellammare");
const UPSTREAM_REPO = "https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi";

const CITTA = {
  nome: "Castellammare di Stabia",
  istat: "063024",
  catastale: "C129",
  codiceFiscale: "82000270635",
  ipa: "c_c129",
  cap: "80053",
};

// Comuni di confronto: vicini della costa stabiese-vesuviana e Comuni della
// Città metropolitana di Napoli con popolazione simile (40-80 mila abitanti).
const CONFRONTO = [
  { nome: "Torre del Greco", istat: "063084" },
  { nome: "Torre Annunziata", istat: "063083" },
  { nome: "Ercolano", istat: "063064" },
  { nome: "Portici", istat: "063059" },
  { nome: "Pozzuoli", istat: "063060" },
  { nome: "Casoria", istat: "063023" },
  { nome: "Afragola", istat: "063002" },
  { nome: "Acerra", istat: "063001" },
  { nome: "Gragnano", istat: "063035" },
  { nome: "Pompei", istat: "063058" },
  { nome: "Sorrento", istat: "063080" },
  { nome: "Vico Equense", istat: "063086" },
];

if (!existsSync(GEN)) {
  console.error(`Cartella dati non trovata: ${GEN}\nClona il repository originale e imposta UPSTREAM_DIR.`);
  process.exit(1);
}

let upstreamCommit = "sconosciuto";
try {
  upstreamCommit = execFileSync("git", ["-C", UPSTREAM, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  // Una copia senza .git resta utilizzabile: il commit viene dichiarato sconosciuto.
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

function readJson(rel) {
  const buf = readFileSync(join(GEN, rel));
  return { data: JSON.parse(buf.toString("utf8")), file: `src/data/generated/${rel}`, sha256: sha256(buf) };
}

function estratto(...files) {
  return { repository: UPSTREAM_REPO, commit: upstreamCommit, file: files.map((f) => ({ percorso: f.file, sha256: f.sha256 })) };
}

// Righe del corpus integrato (jsonl.gz suddivisi in parti). Il filtro testuale
// è solo una prima scrematura veloce: il controllo vero è `match` sulle celle.
function* integratedRows(datasetId, prefilter) {
  const dir = join(GEN, "integrated/rows");
  const parts = readdirSync(dir).filter((f) => f.startsWith(`${datasetId}.part-`)).sort();
  if (parts.length === 0) throw new Error(`Dataset integrato assente: ${datasetId}`);
  for (const part of parts) {
    const text = gunzipSync(readFileSync(join(dir, part))).toString("utf8");
    for (const line of text.split("\n")) {
      if (line && prefilter.test(line)) yield JSON.parse(line);
    }
  }
}

/** Id del dataset integrato più recente che corrisponde al modello (es. occupazione 2010-2024 → 2010-2025). */
function ultimoDatasetIntegrato(regex) {
  const ids = [...new Set(readdirSync(join(GEN, "integrated/rows")).map((f) => f.replace(/\.part-\d+\.jsonl\.gz$/, "")))];
  const trovati = ids.filter((id) => regex.test(id)).sort();
  if (trovati.length === 0) throw new Error(`Nessun dataset integrato per ${regex}`);
  return trovati.at(-1);
}

function catalogEntry(datasetId) {
  const catalog = JSON.parse(readFileSync(join(GEN, "integrated/catalog.json"), "utf8"));
  const list = Array.isArray(catalog.datasets) ? catalog.datasets : Object.values(catalog.datasets);
  const entry = list.find((d) => d.id === datasetId);
  if (!entry) throw new Error(`Dataset non presente nel catalogo: ${datasetId}`);
  return { titolo: entry.title, licenza: entry.licenseStatus, avvertenze: entry.caveats ?? [] };
}

const toInt = (v) => {
  if (v === null || v === undefined || v === "" || v === "n.d.") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const euroToCents = (v) => {
  const n = toInt(v);
  return n === null ? null : Math.round(n * 100);
};

// Scrive il file solo se i dati sono cambiati: la data di generazione da sola non
// conta, così l'aggiornamento automatico non pubblica modifiche vuote.
function write(name, payload) {
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `${name}.json`);
  const senzaData = ({ generato, ...resto }) => JSON.stringify(resto);
  if (existsSync(file)) {
    const prima = JSON.parse(readFileSync(file, "utf8"));
    if (senzaData(prima) === senzaData(payload)) {
      console.log(`= ${name}.json (invariato)`);
      return;
    }
  }
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`✓ ${name}.json (aggiornato)`);
}

const generatedAt = new Date().toISOString();

// Gli anni non sono scritti nel codice: si scoprono dai file presenti, così un
// nuovo anno pubblicato dal progetto originale entra da solo all'estrazione.
const generatedFiles = readdirSync(GEN);
function anniDa(regex) {
  return generatedFiles
    .map((f) => regex.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}
const istatCodes = new Set([CITTA.istat, ...CONFRONTO.map((c) => c.istat)]);

// ---------------------------------------------------------------- IRPEF (anche per nomi e popolazioni)
const annoIrpef = anniDa(/^mef-irpef-(\d{4})\.data\.json$/).at(-1);
if (!annoIrpef) throw new Error("IRPEF comunale: nessun file mef-irpef-AAAA.data.json");
const irpefFile = readJson(`mef-irpef-${annoIrpef}.data.json`);
const irpefMeta = readJson(`mef-irpef-${annoIrpef}.meta.json`);
const irpefMeasures = irpefFile.data.measureOrder;
function decodeIrpefMunicipality(row) {
  // [istat, catastale, nome, codProv, siglaProv, codReg, contribuenti, (freq, centesimi) x 20]
  if (row.length !== 7 + irpefMeasures.length * 2) throw new Error(`Riga IRPEF inattesa per ${row[0]}`);
  const misure = {};
  irpefMeasures.forEach((key, i) => {
    misure[key] = { frequenza: row[7 + i * 2], centesimi: row[8 + i * 2] };
  });
  return { istat: row[0], catastale: row[1], nome: row[2], contribuenti: row[6], misure };
}
function decodeIrpefAggregate(agg) {
  const misure = {};
  irpefMeasures.forEach((key, i) => {
    const [frequenza, centesimi, soppresse] = agg.measures[i];
    misure[key] = { frequenza, centesimi, righeSoppresse: soppresse ?? 0 };
  });
  return { contribuenti: agg.taxpayers, misure };
}
const irpefByIstat = new Map(irpefFile.data.municipalities.filter((r) => istatCodes.has(r[0])).map((r) => [r[0], decodeIrpefMunicipality(r)]));
for (const code of istatCodes) if (!irpefByIstat.has(code)) throw new Error(`IRPEF: Comune ${code} mancante`);
for (const c of CONFRONTO) {
  const name = irpefByIstat.get(c.istat).nome;
  if (name.toUpperCase() !== c.nome.toUpperCase()) throw new Error(`Codice ISTAT ${c.istat} è ${name}, non ${c.nome}`);
}
const regions = Array.isArray(irpefFile.data.regions) ? irpefFile.data.regions : Object.values(irpefFile.data.regions);
const campania = regions.find((r) => r.name === "Campania");
const meta = irpefMeta.data;
write("irpef", {
  id: "irpef",
  titolo: "Redditi e IRPEF dichiarati dai contribuenti",
  fonte: {
    ente: meta.source.owner,
    url: meta.source.landingUrl,
    fileUfficiale: meta.source.assetUrl,
    licenza: meta.source.license,
    periodo: `Anno d'imposta ${meta.period.taxYear} (dichiarazioni ${meta.period.declarationYear})`,
    pubblicato: meta.period.publishedAt,
  },
  avvertenze: [
    "Imposta dichiarata non significa imposta incassata: sono gli importi dovuti secondo le dichiarazioni.",
    "Il Comune è quello del domicilio fiscale del contribuente.",
    "Quando una cella ha troppo pochi contribuenti il MEF la oscura per privacy: il totale noto è allora un minimo.",
  ],
  estratto: estratto(irpefFile, irpefMeta),
  generato: generatedAt,
  annoImposta: meta.period.taxYear,
  misure: irpefMeasures,
  castellammare: irpefByIstat.get(CITTA.istat),
  campania: decodeIrpefAggregate(campania),
  italia: decodeIrpefAggregate(irpefFile.data.national.assigned),
  confronto: CONFRONTO.map((c) => irpefByIstat.get(c.istat)),
});

// ---------------------------------------------------------------- SIOPE: incassi e pagamenti di cassa
function siopeYear(kind, rel) {
  const f = readJson(rel);
  const d = f.data;
  const pick = (name) => d.municipalities.find((r) => r[2] === `COMUNE DI ${name.toUpperCase()}`);
  const decode = (row, nome) => {
    if (!row) throw new Error(`SIOPE ${rel}: ${nome} mancante`);
    const [codiceFiscale, ipa, , , , popolazione, totale, perTitolo] = row;
    return {
      nome,
      codiceFiscale,
      ipa,
      popolazione,
      totaleCentesimi: totale,
      perTitolo: d.titleOrder.map((code, i) => ({ codice: code, voce: d.titleLabels[code], centesimi: perTitolo[i] })),
    };
  };
  return {
    file: f,
    anno: d.year,
    ultimoMese: d.latestMonth,
    completo: d.latestMonth === 12,
    tipo: kind,
    castellammare: decode(pick(CITTA.nome), CITTA.nome),
    confronto: CONFRONTO.map((c) => decode(pick(c.nome), c.nome)),
  };
}
// Pagamenti: un file per anno chiuso più "siope-municipal-detail.json" per l'anno in corso.
// Incassi: un file per anno. Teniamo gli ultimi tre anni, senza doppioni.
function ultimiTreAnni(kind, files) {
  const perAnno = new Map();
  for (const f of files) {
    const y = siopeYear(kind, f);
    const prima = perAnno.get(y.anno);
    if (!prima || y.ultimoMese > prima.ultimoMese) perAnno.set(y.anno, y);
  }
  return [...perAnno.values()].sort((a, b) => a.anno - b.anno).slice(-3);
}
const siopeFiles = [
  ...ultimiTreAnni("pagamenti", generatedFiles.filter((f) => /^siope-municipal-detail(-\d{4})?\.json$/.test(f))),
  ...ultimiTreAnni("incassi", generatedFiles.filter((f) => /^siope-municipal-receipts-detail-\d{4}\.json$/.test(f))),
];
if (siopeFiles.filter((y) => y.completo).length < 4) throw new Error("SIOPE: servono almeno due anni completi di pagamenti e incassi");
for (const y of siopeFiles) {
  if (y.castellammare.codiceFiscale !== CITTA.codiceFiscale) throw new Error("SIOPE: codice fiscale del Comune inatteso");
  const sum = y.castellammare.perTitolo.reduce((a, t) => a + (t.centesimi ?? 0), 0);
  if (sum !== y.castellammare.totaleCentesimi) throw new Error(`SIOPE ${y.anno} ${y.tipo}: i titoli non tornano col totale`);
}
write("siope", {
  id: "siope",
  titolo: "Incassi e pagamenti di cassa del Comune",
  fonte: {
    ente: "Banca d'Italia · Ragioneria Generale dello Stato (SIOPE)",
    url: "https://www.siope.it/Siope/",
    licenza: "IODL 2.0 / CC BY",
    periodo: "2024, 2025 e 2026 (fino all'ultimo mese disponibile)",
  },
  avvertenze: [
    "Sono movimenti di cassa: soldi effettivamente entrati o usciti nell'anno, anche se riferiti a impegni di anni precedenti.",
    "Le partite di giro e i conti per terzi sono soldi che il Comune incassa e gira ad altri (ritenute, depositi): non sono spesa del Comune.",
    "Il 2026 è parziale: arriva fino all'ultimo mese pubblicato.",
  ],
  estratto: estratto(...siopeFiles.map((y) => y.file)),
  generato: generatedAt,
  anni: siopeFiles.map(({ file, ...rest }) => rest),
});

// ---------------------------------------------------------------- OpenCivitas: spesa storica vs fabbisogno standard
const ocYears = anniDa(/^opencivitas-(\d{4})\.json$/);
const ocFunctions = [
  ["rifiuti", "Rifiuti"],
  ["amministrazione", "Uffici e amministrazione"],
  ["sociale-asili", "Sociale e asili nido"],
  ["polizia", "Polizia locale"],
  ["istruzione", "Scuole (servizi comunali)"],
  ["viabilita", "Strade e territorio"],
];
const ocFiles = [];
function ocRows(rel) {
  const f = readJson(rel);
  ocFiles.push(f);
  const cols = f.data.municipalityColumns;
  const toObj = (r) => Object.fromEntries(cols.map((c, i) => [c, r[i]]));
  return { f, rows: new Map(f.data.municipalityRows.filter((r) => istatCodes.has(r[0])).map((r) => [r[0], toObj(r)])) };
}
const ocSlim = (o) =>
  o && {
    spesaStoricaCentesimi: o.historicalSpendingCents,
    spesaStandardCentesimi: o.standardSpendingCents,
    storicaPerAbitanteCentesimi: o.historicalPerCapitaCents,
    standardPerAbitanteCentesimi: o.standardPerCapitaCents,
    differenzaPuntiBase: o.differenceBasisPoints,
    serviziDifferenzaPuntiBase: o.serviceDifferenceBasisPoints,
    livelloSpesa: o.spendingLevel,
    livelloServizi: o.serviceLevel,
  };
const ocSeries = ocYears.map((year) => {
  const { f, rows } = ocRows(`opencivitas-${year}.json`);
  return { anno: year, fonte: f.data.source ?? null, castellammare: ocSlim(rows.get(CITTA.istat)) };
});
// Anni in cui la fonte pubblica tutte e sei le funzioni (servono per lo scontrino).
const ocAnniFunzioni = ocYears.filter((y) => ocFunctions.every(([slug]) => generatedFiles.includes(`opencivitas-${y}-${slug}.json`)));
const ocFunctionYears = ocAnniFunzioni.slice(-3).map((year) => ({
  anno: year,
  funzioni: ocFunctions.map(([slug, label]) => {
    const { rows } = ocRows(`opencivitas-${year}-${slug}.json`);
    return { id: slug, voce: label, castellammare: ocSlim(rows.get(CITTA.istat)), confronto: CONFRONTO.map((c) => ({ nome: c.nome, ...ocSlim(rows.get(c.istat)) })) };
  }),
}));
const oc2022 = ocRows("opencivitas-2022.json");
const ocSource = oc2022.f.data.source;
write("opencivitas", {
  id: "opencivitas",
  titolo: "Spesa del Comune per le funzioni fondamentali, confrontata con il fabbisogno standard",
  fonte: {
    ente: ocSource.owner,
    url: ocSource.landingUrl,
    licenza: ocSource.license,
    periodo: (() => {
      const mancanti = [];
      for (let y = ocYears[0]; y <= ocYears.at(-1); y++) if (!ocYears.includes(y)) mancanti.push(y);
      return `${ocYears[0]}-${ocYears.at(-1)}${mancanti.length ? ` (manca${mancanti.length > 1 ? "no" : ""} il ${mancanti.join(", ")})` : ""}`;
    })(),
  },
  avvertenze: [
    "La spesa standard è quanto lo Stato stima che servirebbe a un Comune con le stesse caratteristiche: non è un tetto né un obiettivo di legge.",
    "Una spesa sopra lo standard chiede una spiegazione; una spesa sotto lo standard può corrispondere a meno servizi.",
    "Riguarda solo le funzioni fondamentali (amministrazione, polizia locale, istruzione, strade, rifiuti, sociale), non tutto il bilancio.",
    "Il livello dei servizi confronta i servizi offerti con la media dei Comuni della stessa fascia di popolazione.",
  ],
  metodologia: oc2022.f.data.methodology,
  estratto: estratto(...ocFiles.filter((f, i, a) => a.findIndex((g) => g.file === f.file) === i)),
  generato: generatedAt,
  serie: ocSeries.map(({ fonte, ...rest }) => rest),
  funzioni: ocFunctionYears,
  confronto2022: CONFRONTO.map((c) => ({ nome: c.nome, istat: c.istat, ...ocSlim(oc2022.rows.get(c.istat)) })),
});

// ---------------------------------------------------------------- PNRR: progetti localizzati a Castellammare
const pnrrRows = [];
const pnrrEstrazioni = new Set();
for (const r of integratedRows("pnrr-progetti", /CASTELLAMMARE DI STABIA/i)) {
  const c = r.cells;
  if (c["Data di Estrazione"]) pnrrEstrazioni.add(c["Data di Estrazione"]);
  let locs = [];
  try {
    locs = JSON.parse(c["Localizzazioni"] ?? "[]");
  } catch {
    throw new Error(`PNRR: localizzazioni illeggibili per ${c.CUP}`);
  }
  const here = locs.find((l) => l[2] === "063" && l[4] === "024");
  if (!here) continue; // la parola compare altrove (es. nel nome del soggetto), ma il progetto non è localizzato qui
  pnrrRows.push({
    cup: c["CUP"],
    titolo: c["Titolo Progetto"],
    missione: c["Missione"],
    missioneDescrizione: c["Descrizione Missione"],
    componente: c["Descrizione Componente"],
    misura: c["Descrizione Misura"],
    submisura: c["Descrizione Submisura"],
    codiceMisura: c["Codice Univoco Submisura"] ?? c["Codice Univoco Misura"],
    amministrazioneTitolare: c["Amministrazione Titolare"],
    soggettoAttuatore: c["Soggetto Attuatore"],
    codiceFiscaleAttuatore: c["Codice Fiscale Soggetto Attuatore"],
    finanziamentoPnrrCentesimi: euroToCents(c["Finanziamento PNRR"]),
    finanziamentoTotaleCentesimi: euroToCents(c["Finanziamento Totale"]),
    stato: c["Stato Avanzamento Progetto"],
    inizioPrevisto: c["Data Inizio Progetto Prevista"],
    inizioEffettivo: c["Data Inizio Progetto Effettiva"] || null,
    finePrevista: c["Data Fine Progetto Prevista"],
    fineEffettiva: c["Data Fine Progetto Effettiva"] || null,
    localizzazioni: locs.length,
    // Quota del progetto attribuita dalla fonte a Castellammare ("50,00" = metà).
    quotaPercentuale: toInt(here[6]),
    finanziamentoAttribuitoCentesimi:
      toInt(here[6]) === null || euroToCents(c["Finanziamento Totale"]) === null
        ? null
        : Math.round((euroToCents(c["Finanziamento Totale"]) * toInt(here[6])) / 100),
  });
}
pnrrRows.sort((a, b) => (b.finanziamentoTotaleCentesimi ?? 0) - (a.finanziamentoTotaleCentesimi ?? 0));
const pnrrCatalog = catalogEntry("pnrr-progetti");
write("pnrr", {
  id: "pnrr",
  titolo: "Progetti PNRR localizzati a Castellammare di Stabia",
  fonte: {
    ente: "Italia Domani · Presidenza del Consiglio / MEF (ReGiS)",
    url: "https://www.italiadomani.gov.it/content/sogei-ng/it/it/catalogo-open-data.html",
    licenza: "CC BY 4.0",
    periodo: pnrrCatalog.titolo.replace(/^.*· /, "Estrazione del "),
  },
  avvertenze: [
    "Il finanziamento è quello assegnato al progetto, non quanto è già stato pagato.",
    "Alcuni progetti sono localizzati in più Comuni: per questi indichiamo anche la quota che la fonte attribuisce a Castellammare.",
    "Comprende anche crediti d'imposta a imprese (Transizione 5.0) e progetti di scuole ed enti diversi dal Comune.",
  ],
  estratto: { repository: UPSTREAM_REPO, commit: upstreamCommit, file: [{ percorso: "src/data/generated/integrated/rows/pnrr-progetti.part-*.jsonl.gz" }] },
  generato: generatedAt,
  // Data a cui la fonte fotografa lo stato dei progetti: i ritardi si misurano rispetto a questa, non a oggi.
  dataEstrazione: [...pnrrEstrazioni].sort().at(-1) ?? null,
  progetti: pnrrRows,
});

// ---------------------------------------------------------------- Personale del Comune (Conto annuale RGS)
const staffRows = [];
for (const r of integratedRows(ultimoDatasetIntegrato(/^rgs-conto-annuale-occupazione-ente-\d{4}-\d{4}$/), /CASTELLAMMARE DI STABIA/i)) {
  const c = r.cells;
  // Il nome dell'ente cambia nel 2021 ("COMUNE DI ..."): il codice istituzione RGS 1889 resta stabile
  // ed esclude l'AAST e Castellammare del Golfo.
  if (c["Codice istituzione"] !== "1889" || c["Tipo istituzione"] !== "COMUNI") continue;
  const n = (k) => toInt(c[k]) ?? 0;
  const fissi = (s) => n(`Numero Dipendenti ${s} Tempo Pieno`) + n(`Numero Dipendenti ${s} Part time Inf. 50%`) + n(`Numero Dipendenti ${s} Part time Sup. 50%`);
  const flessibili = (s) =>
    n(`Numero Dipendenti ${s} Tempo Determinato`) + n(`Numero Dipendenti ${s} Formazione Lavoro`) + n(`Numero Dipendenti ${s} Lavoro Interinale`) + n(`Numero Dipendenti ${s} Lavoro Socialmente Utile`);
  staffRows.push({
    anno: Number(c["Anno"]),
    donne: Math.round((fissi("Donne") + flessibili("Donne")) * 100) / 100,
    uomini: Math.round((fissi("Uomini") + flessibili("Uomini")) * 100) / 100,
    tempoIndeterminato: fissi("Donne") + fissi("Uomini"),
    // Dal 2021 la fonte esprime il lavoro flessibile in unità annue, con decimali.
    flessibili: Math.round((flessibili("Donne") + flessibili("Uomini")) * 100) / 100,
  });
}
staffRows.sort((a, b) => a.anno - b.anno);
const DS_COSTO = ultimoDatasetIntegrato(/^rgs-conto-annuale-costo-\d{4}$/);
const ANNO_COSTO = Number(DS_COSTO.slice(-4));
const costRows = [];
for (const r of integratedRows(DS_COSTO, /CASTELLAMMARE DI STABIA/i)) {
  const c = r.cells;
  if (c["Codice istituzione"] !== "1889" || c["Descrizione tipo"] !== "COMUNI") continue;
  const cents = euroToCents(c["Importo euro"]);
  costRows.push({ voce: c["Descrizione voce"], codice: c["Voce spesa"], contratto: c["Contratto"], centesimi: c["Segno fonte"] === "-" ? -cents : cents });
}
costRows.sort((a, b) => b.centesimi - a.centesimi);
write("personale", {
  id: "personale",
  titolo: "Chi lavora per il Comune",
  fonte: {
    ente: "Ragioneria Generale dello Stato · Conto annuale",
    url: "https://contoannuale.rgs.mef.gov.it/",
    licenza: "CC BY 3.0 (occupazione) · CC BY 4.0 (costo del lavoro)",
    periodo: `Dipendenti ${staffRows[0]?.anno}-${staffRows.at(-1)?.anno}; costo del lavoro ${ANNO_COSTO}`,
  },
  avvertenze: [
    "Il personale a tempo indeterminato (anche part-time) è contato al 31 dicembre di ogni anno.",
    "Il lavoro flessibile (tempo determinato, interinale, LSU) dal 2021 è espresso dalla fonte in unità annue, quindi può avere decimali.",
    `Il costo del lavoro dettagliato è disponibile, per ora, solo per il ${ANNO_COSTO}.`,
  ],
  estratto: { repository: UPSTREAM_REPO, commit: upstreamCommit, file: [{ percorso: "src/data/generated/integrated/rows/rgs-conto-annuale-*.jsonl.gz" }] },
  generato: generatedAt,
  dipendenti: staffRows,
  annoCosto: ANNO_COSTO,
  costo2020: costRows,
});

// ---------------------------------------------------------------- Patrimonio immobiliare pubblico in città
const beni = [];
for (const r of integratedRows(ultimoDatasetIntegrato(/^mef-patrimonio-beni-\d{4}$/), /C129/)) {
  const c = r.cells;
  if (c["Codice catastale comune del bene"] !== CITTA.catastale) continue;
  beni.push({
    ente: c["Ente"],
    tipologiaEnte: c["Tipologia ente"],
    tipologiaBene: c["Tipologia bene"],
    utilizzo: c["Utilizzo del bene"],
    datoATerzi: c["Dato a terzi"],
    titolo: c["Titolo"],
    beni: toInt(c["Beni"]),
    superficieMq: toInt(c["Superficie di riferimento (m²)"]),
  });
}
const fermi = [];
for (const r of integratedRows(ultimoDatasetIntegrato(/^mef-patrimonio-fabbricati-fermi-\d{4}$/), /C129/)) {
  const c = r.cells;
  if (c["Codice catastale comune del bene"] !== CITTA.catastale) continue;
  fermi.push({
    ente: c["Ente"],
    tipologiaBene: c["Tipologia bene"],
    utilizzo: c["Utilizzo del bene"],
    fabbricati: toInt(c["Fabbricati"]),
    superficieMq: toInt(c["Superficie di riferimento (m²)"]),
  });
}
write("patrimonio", {
  id: "patrimonio",
  titolo: "Immobili pubblici a Castellammare",
  fonte: {
    ente: "MEF · Dipartimento del Tesoro (censimento immobili pubblici)",
    url: "https://www.de.mef.gov.it/it/attivita_istituzionali/patrimonio_pubblico/censimento_immobili_pubblici/",
    licenza: "CC BY 4.0",
    periodo: "Censimento 2023",
  },
  avvertenze: [
    "Sono i beni dichiarati dagli enti al censimento del MEF: un bene non dichiarato non compare.",
    "Comprende immobili di più enti (Comune, Comune di Napoli, Agenzia regionale per l'edilizia residenziale, ecc.), non solo del Comune di Castellammare.",
    "“Non utilizzato” è lo stato dichiarato dall'ente proprietario alla data del censimento.",
  ],
  estratto: { repository: UPSTREAM_REPO, commit: upstreamCommit, file: [{ percorso: "src/data/generated/integrated/rows/mef-patrimonio-*-2023.part-*.jsonl.gz" }] },
  generato: generatedAt,
  beni,
  fabbricatiFermi: fermi,
});

// ---------------------------------------------------------------- Appalti aggiudicati dal Comune (ANAC)
const anacShard = createHash("sha256").update(CITTA.ipa).digest("hex").slice(0, 2);
const anacRel = `anac-entity-procurement-page/entities/${anacShard}.jsonl.gz`;
const anacBuf = readFileSync(join(GEN, anacRel));
const anacProfile = gunzipSync(anacBuf)
  .toString("utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .find((r) => r.codiceIpa === CITTA.ipa);
if (!anacProfile) throw new Error("ANAC: profilo del Comune non trovato");
const anacMeta = readJson("anac-entity-procurement-page/meta.json");
const opName = new Map(anacProfile.operators.map((o) => [o.ref, o.name]));
write("appalti", {
  id: "appalti",
  titolo: "Appalti aggiudicati dal Comune",
  fonte: {
    ente: "ANAC · Autorità Nazionale Anticorruzione (Banca dati contratti pubblici)",
    url: "https://dati.anticorruzione.it/opendata/dataset/aggiudicazioni",
    licenza: "CC BY 4.0",
    periodo: `Aggiudicazioni dal ${anacProfile.awards.map((a) => a.awardedAt).filter(Boolean).sort()[0]} al ${anacProfile.awards.map((a) => a.awardedAt).filter(Boolean).sort().at(-1)}`,
  },
  avvertenze: [
    "L'importo è quello di aggiudicazione dichiarato, non quanto è stato effettivamente pagato.",
    "Quando un appalto è diviso fra più imprese l'importo resta nel totale del Comune ma non viene attribuito alle singole imprese.",
    "Classifiche e totali descrivono i dati; per valutare un caso servono gli atti.",
    ...anacMeta.data.limitations.filter((l) => /snapshot|copertura/.test(l)),
  ],
  estratto: estratto({ file: `src/data/generated/${anacRel}`, sha256: sha256(anacBuf) }, anacMeta),
  generato: generatedAt,
  riepilogo: anacProfile.summary,
  fornitori: anacProfile.operators.map((o) => ({
    nome: o.name,
    aggiudicazioni: o.awardCount,
    importoAttribuitoCentesimi: euroToCents(o.attributedValue),
    posizionePerImporto: o.rankByValue,
  })),
  aggiudicazioni: anacProfile.awards
    .map((a) => ({
      cig: a.cig,
      data: a.awardedAt,
      importoCentesimi: euroToCents(a.amount),
      attribuzione: a.attribution,
      fornitori: a.operatorRefs.map((ref) => opName.get(ref) ?? "Non identificato"),
    }))
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")),
});

// ---------------------------------------------------------------- Scuole statali in città
let scuole = null;
for (const r of integratedRows("mim-scuole-statali-comuni", /063024/)) {
  if (r.cells["Codice ISTAT comune"] === CITTA.istat) scuole = { annoScolastico: r.cells["Anno scolastico"], sedi: toInt(r.cells["Sedi scolastiche statali"]) };
}
const scuoleCatalog = catalogEntry("mim-scuole-statali-comuni");
write("scuole", {
  id: "scuole",
  titolo: "Scuole statali in città",
  fonte: { ente: "Ministero dell'Istruzione e del Merito", url: "https://dati.istruzione.it/opendata/", licenza: scuoleCatalog.licenza.includes("iodl") ? "IODL 2.0" : scuoleCatalog.licenza, periodo: scuole?.annoScolastico ?? "" },
  avvertenze: ["Conta le sedi (plessi) delle scuole statali, non gli istituti né le scuole paritarie."],
  estratto: { repository: UPSTREAM_REPO, commit: upstreamCommit, file: [{ percorso: "src/data/generated/integrated/rows/mim-scuole-statali-comuni.part-*.jsonl.gz" }] },
  generato: generatedAt,
  ...scuole,
});

console.log(`\nDati estratti da ${UPSTREAM_REPO} @ ${upstreamCommit.slice(0, 12)}`);

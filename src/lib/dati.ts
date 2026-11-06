// Accesso tipizzato ai dati estratti (src/data/castellammare) e alcuni valori
// derivati usati da più pagine. Tutti i calcoli restano qui, non nei componenti.

import appaltiJson from "@/data/castellammare/appalti.json";
import irpefJson from "@/data/castellammare/irpef.json";
import ocJson from "@/data/castellammare/opencivitas.json";
import coesioneJson from "@/data/castellammare/opencoesione.json";
import pagamentiJson from "@/data/castellammare/pagamenti.json";
import patrimonioJson from "@/data/castellammare/patrimonio.json";
import personaleJson from "@/data/castellammare/personale.json";
import pnrrJson from "@/data/castellammare/pnrr.json";
import scuoleJson from "@/data/castellammare/scuole.json";
import siopeJson from "@/data/castellammare/siope.json";

export type Fonte = { ente: string; url: string; licenza: string; periodo: string; fileUfficiale?: string; pubblicato?: string };
export type Dataset = { id: string; titolo: string; fonte: Fonte; avvertenze: string[]; estratto: { repository: string; commit?: string; scaricato?: string | null } };

export const CITTA = { nome: "Castellammare di Stabia", cap: "80053", istat: "063024" } as const;

// ------------------------------------------------------------------ OpenCivitas
type OcSlim = {
  spesaStoricaCentesimi: number;
  spesaStandardCentesimi: number;
  storicaPerAbitanteCentesimi: number;
  standardPerAbitanteCentesimi: number;
  differenzaPuntiBase: number;
  serviziDifferenzaPuntiBase: number;
  livelloSpesa: number | null;
  livelloServizi: number | null;
};
type OcFunzione = { id: string; voce: string; castellammare: OcSlim; confronto: (OcSlim & { nome: string })[] };
type Oc = Dataset & {
  metodologia: Record<string, string>;
  serie: { anno: number; castellammare: OcSlim }[];
  funzioni: { anno: number; funzioni: OcFunzione[] }[];
  confronto2022: (OcSlim & { nome: string; istat: string })[];
};
export const opencivitas = ocJson as unknown as Oc;

export type VoceScontrino = {
  id: string;
  voce: string;
  perAbitante: number;
  standardPerAbitante: number;
  scartoPercentuale: number;
  quota: number;
  livelloServizi: number | null;
};

/** Lo "scontrino": spesa per abitante per funzione, ordinata dalla più grande. */
export function scontrino(anno = 2022): { anno: number; totale: number; voci: VoceScontrino[] } {
  const blocco = opencivitas.funzioni.find((f) => f.anno === anno);
  if (!blocco) throw new Error(`OpenCivitas ${anno} non disponibile`);
  const totale = blocco.funzioni.reduce((a, f) => a + f.castellammare.storicaPerAbitanteCentesimi, 0) / 100;
  const voci = blocco.funzioni
    .map((f) => {
      const c = f.castellammare;
      const perAbitante = c.storicaPerAbitanteCentesimi / 100;
      return {
        id: f.id,
        voce: f.voce,
        perAbitante,
        standardPerAbitante: c.standardPerAbitanteCentesimi / 100,
        scartoPercentuale: c.differenzaPuntiBase / 100,
        quota: perAbitante / totale,
        livelloServizi: c.livelloServizi,
      };
    })
    .sort((a, b) => b.perAbitante - a.perAbitante);
  return { anno, totale, voci };
}

// ------------------------------------------------------------------ SIOPE
import type { EnteSiope } from "./conti";
export { titolo, totaleProprio, type EnteSiope, type Titolo } from "./conti";
type AnnoSiope = { anno: number; ultimoMese: number; completo: boolean; tipo: "pagamenti" | "incassi"; castellammare: EnteSiope; confronto: EnteSiope[] };
export const siope = siopeJson as unknown as Dataset & { anni: AnnoSiope[] };

export function siopeAnno(tipo: "pagamenti" | "incassi", anno: number) {
  const y = siope.anni.find((a) => a.tipo === tipo && a.anno === anno);
  if (!y) throw new Error(`SIOPE ${tipo} ${anno} non disponibile`);
  return y;
}

export const anniSiopeCompleti = [...new Set(siope.anni.filter((a) => a.completo).map((a) => a.anno))].sort();
export const ultimoAnnoSiope = Math.max(...anniSiopeCompleti);

// ------------------------------------------------------------------ IRPEF
type Misura = { frequenza: number; centesimi: number; righeSoppresse?: number };
type ContribuentiBlocco = { contribuenti: number; misure: Record<string, Misura> };
type Irpef = Dataset & {
  annoImposta: number;
  castellammare: ContribuentiBlocco & { nome: string; istat: string };
  campania: ContribuentiBlocco;
  italia: ContribuentiBlocco;
  confronto: (ContribuentiBlocco & { nome: string; istat: string })[];
};
export const irpef = irpefJson as unknown as Irpef;

export function redditoMedio(b: ContribuentiBlocco): number {
  const m = b.misure.comprehensiveIncome;
  return m.centesimi / 100 / m.frequenza;
}

export const FASCE_REDDITO = [
  ["nonPositiveComprehensiveIncome", "Zero o negativo"],
  ["comprehensiveIncome0To10000", "Fino a 10.000 €"],
  ["comprehensiveIncome10000To15000", "10.000 – 15.000 €"],
  ["comprehensiveIncome15000To26000", "15.000 – 26.000 €"],
  ["comprehensiveIncome26000To55000", "26.000 – 55.000 €"],
  ["comprehensiveIncome55000To75000", "55.000 – 75.000 €"],
  ["comprehensiveIncome75000To120000", "75.000 – 120.000 €"],
  ["comprehensiveIncomeOver120000", "Oltre 120.000 €"],
] as const;

export const FONTI_REDDITO = [
  ["employmentIncome", "Lavoro dipendente"],
  ["pensionIncome", "Pensione"],
  ["selfEmploymentIncome", "Lavoro autonomo"],
  ["ordinaryBusinessIncome", "Impresa (contabilità ordinaria)"],
  ["simplifiedBusinessIncome", "Impresa (contabilità semplificata)"],
  ["participationIncome", "Partecipazione in società"],
  ["buildingIncome", "Fabbricati"],
] as const;

// ------------------------------------------------------------------ PNRR
export type ProgettoPnrr = {
  cup: string;
  titolo: string;
  missione: string;
  missioneDescrizione: string;
  componente: string;
  misura: string;
  submisura: string;
  amministrazioneTitolare: string;
  soggettoAttuatore: string;
  finanziamentoPnrrCentesimi: number | null;
  finanziamentoTotaleCentesimi: number | null;
  finanziamentoAttribuitoCentesimi: number | null;
  stato: string;
  inizioPrevisto: string;
  finePrevista: string;
  fineEffettiva: string | null;
  localizzazioni: number;
  quotaPercentuale: number | null;
};
export const pnrr = pnrrJson as unknown as Dataset & { dataEstrazione: string | null; progetti: ProgettoPnrr[] };
export const isComune = (soggetto: string) => /COMUNE DI CASTELLAMMARE/i.test(soggetto);

// ------------------------------------------------------------------ Personale
export const personale = personaleJson as unknown as Dataset & {
  dipendenti: { anno: number; donne: number; uomini: number; tempoIndeterminato: number; flessibili: number }[];
  costo2020: { voce: string; codice: string; contratto: string; centesimi: number }[];
};

// ------------------------------------------------------------------ Appalti
export const appalti = appaltiJson as unknown as Dataset & {
  riepilogo: { awardCount: number; awardValue: string; awardeeCount: number; attributedAwardValue: string; unattributedAwardValue: string; multipartOrAmbiguousAwards: number };
  fornitori: { nome: string; aggiudicazioni: number; importoAttribuitoCentesimi: number | null; posizionePerImporto: number | null }[];
  aggiudicazioni: { cig: string; data: string | null; importoCentesimi: number | null; attribuzione: string; fornitori: string[] }[];
};

// ------------------------------------------------------------------ Patrimonio e scuole
export const patrimonio = patrimonioJson as unknown as Dataset & {
  beni: { ente: string; tipologiaEnte: string; tipologiaBene: string; utilizzo: string; datoATerzi: string; titolo: string; beni: number | null; superficieMq: number | null }[];
  fabbricatiFermi: { ente: string; tipologiaBene: string; utilizzo: string; fabbricati: number | null; superficieMq: number | null }[];
};
export const scuole = scuoleJson as unknown as Dataset & { annoScolastico: string; sedi: number };


// ------------------------------------------------------------------ Pagamenti ai fornitori (RGS)
export type PeriodoTempi = { periodo: string; anno: number; completo: boolean; ritardoGiorni: number | null; pagamentoGiorni: number | null; fatture: number | null };
export type PeriodoDebito = { periodo: string; anno: number; completo: boolean; centesimi: number | null; tipo: string };
export const pagamenti = pagamentiJson as unknown as Dataset & {
  metodologia: string;
  comuni: { ipa: string; nome: string; tempi: PeriodoTempi[]; debito: PeriodoDebito[] }[];
};

// ------------------------------------------------------------------ Fondi di coesione (OpenCoesione)
export type ProgettoCoesione = {
  codice: string;
  cup: string | null;
  titolo: string;
  ciclo: string;
  tema: string | null;
  natura: string | null;
  fondo: string | null;
  programma: string | null;
  soggetto: string | null;
  delComune: boolean;
  finanziamentoCentesimi: number | null;
  coesioneCentesimi: number | null;
  pagamentiCentesimi: number | null;
  stato: string | null;
  inizio: string | null;
  finePrevista: string | null;
  fineEffettiva: string | null;
  comuni: number;
  link: string | null;
};
export const opencoesione = coesioneJson as unknown as Dataset & { dataDati: string; esclusiDalPortale: number; progetti: ProgettoCoesione[] };

// ------------------------------------------------------------------ Cosa non va (e cosa va)
import { calcolaCoseCheVanno, calcolaSegnali, type DatiSegnali } from "./segnali";
const datiSegnali = { opencivitas, siope, personale, patrimonio, pnrr, irpef, pagamenti, opencoesione } as unknown as DatiSegnali;
export const segnali = calcolaSegnali(datiSegnali);
export const coseCheVanno = calcolaCoseCheVanno(datiSegnali);

export const TUTTI_I_DATASET: Dataset[] = [siope, opencivitas, pagamenti, irpef, pnrr, opencoesione, appalti, personale, patrimonio, scuole];

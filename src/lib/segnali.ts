// Lo specchietto "Cosa non va": punti critici ricavati dai dati con regole
// fisse e soglie dichiarate. Ogni punto dice cosa misura, con cosa lo
// confronta e cosa chiedere: un segnale indica dove guardare, non una colpa.
//
// Funzione pura: riceve i dati già caricati, così i test la eseguono con Node.

import { titolo, totaleProprio, type EnteSiope } from "./conti.ts";
import { data, euro, euroMln, numero, percentualeConSegno } from "./format.ts";

export const SOGLIE = {
  /** Spesa sopra lo standard da segnalare (punti percentuali). */
  sopraStandard: 15,
  /** Spesa sotto lo standard da segnalare. */
  sottoStandard: -30,
  /** Livello dei servizi OpenCivitas (0-10) considerato basso. */
  serviziBassi: 3,
  /** Calo del personale stabile dal primo anno disponibile. */
  caloPersonale: -25,
  /** Calo dei tributi incassati tra gli ultimi due anni completi. */
  caloTributi: -5,
  /** Reddito medio sotto la media italiana. */
  redditoSottoItalia: -10,
  /** Giorni medi di ritardo nei pagamenti ai fornitori (tempo medio ponderato di ritardo). */
  ritardoPagamenti: 0,
  /** Calo del debito commerciale scaduto, per segnalarlo tra le cose che vanno bene. */
  caloDebito: -25,
} as const;

export type Area = "Servizi" | "Spesa" | "Entrate" | "PNRR" | "Fondi europei" | "Personale" | "Patrimonio" | "Contesto" | "Pagamenti";

export type Segnale = {
  id: string;
  area: Area;
  titolo: string;
  dato: string;
  confronto: string;
  spiegazione: string;
  domanda: string;
  fonte: string;
  link: string;
};

type OcSlim = {
  storicaPerAbitanteCentesimi: number;
  standardPerAbitanteCentesimi: number;
  differenzaPuntiBase: number;
  serviziDifferenzaPuntiBase: number;
  livelloServizi: number | null;
};

export type DatiSegnali = {
  opencivitas: { serie: { anno: number; castellammare: OcSlim | null }[]; funzioni: { anno: number; funzioni: { id: string; voce: string; castellammare: OcSlim }[] }[] };
  siope: { anni: { anno: number; completo: boolean; tipo: "pagamenti" | "incassi"; castellammare: EnteSiope }[] };
  personale: { dipendenti: { anno: number; tempoIndeterminato: number }[] };
  patrimonio: { fabbricatiFermi: { ente: string; utilizzo: string; fabbricati: number | null }[] };
  pnrr: { dataEstrazione: string | null; progetti: { stato: string; finePrevista: string; soggettoAttuatore: string; finanziamentoAttribuitoCentesimi: number | null }[] };
  pagamenti?: {
    comuni: {
      ipa: string;
      nome: string;
      tempi: { periodo: string; anno: number; completo: boolean; ritardoGiorni: number | null; pagamentoGiorni: number | null }[];
      debito: { periodo: string; anno: number; completo: boolean; centesimi: number | null }[];
    }[];
  };
  opencoesione?: {
    dataDati: string | null;
    progetti: { stato: string | null; finePrevista: string | null; comuni: number; delComune: boolean; finanziamentoCentesimi: number | null; pagamentiCentesimi: number | null }[];
  };
  irpef: {
    annoImposta: number;
    castellammare: { misure: Record<string, { frequenza: number; centesimi: number }> };
    italia: { misure: Record<string, { frequenza: number; centesimi: number }> };
  };
};

const DOMANDE_SOPRA: Record<string, string> = {
  amministrazione: "Quali costi fanno salire la spesa per uffici e amministrazione: personale, consulenze, contenziosi, organi istituzionali?",
  rifiuti: "Perché la gestione dei rifiuti costa più dello standard e quali risultati ottiene in raccolta differenziata e pulizia?",
};

// Nomi brevi delle funzioni OpenCivitas, per elenchi leggibili.
const BREVE: Record<string, string> = {
  amministrazione: "uffici",
  istruzione: "scuole",
  viabilita: "strade",
  "sociale-asili": "sociale e asili nido",
  polizia: "polizia locale",
  rifiuti: "rifiuti",
};
const breve = (f: { id: string; voce: string }) => BREVE[f.id] ?? f.voce.toLowerCase();

const variazione = (nuovo: number, vecchio: number) => ((nuovo - vecchio) / vecchio) * 100;
const daGgMmAaaa = (s: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const elenco = (voci: string[]) => (voci.length <= 1 ? voci.join("") : `${voci.slice(0, -1).join(", ")} e ${voci.at(-1)}`);
const redditoMedio = (b: { misure: Record<string, { frequenza: number; centesimi: number }> }) =>
  b.misure.comprehensiveIncome.centesimi / 100 / b.misure.comprehensiveIncome.frequenza;

export function calcolaSegnali(d: DatiSegnali): Segnale[] {
  const out: Segnale[] = [];

  // ---------------------------------------------------------------- OpenCivitas
  const ultimaSerie = d.opencivitas.serie.filter((s) => s.castellammare).at(-1);
  if (ultimaSerie?.castellammare && (ultimaSerie.castellammare.livelloServizi ?? 99) <= SOGLIE.serviziBassi) {
    const c = ultimaSerie.castellammare;
    out.push({
      id: "servizi-bassi",
      area: "Servizi",
      titolo: "Il livello dei servizi è molto basso",
      dato: `${numero(c.livelloServizi)}/10 nel ${ultimaSerie.anno}`,
      confronto: `servizi ${percentualeConSegno(c.serviziDifferenzaPuntiBase / 100)} rispetto ai Comuni della stessa dimensione`,
      spiegazione:
        "È l'indicatore OpenCivitas che confronta quanti servizi offre il Comune con la media dei Comuni della stessa fascia di popolazione.",
      domanda: "Quali servizi offerti dai Comuni simili mancano a Castellammare, e perché?",
      fonte: `OpenCivitas ${ultimaSerie.anno}`,
      link: "/comune",
    });
  }

  const blocco = d.opencivitas.funzioni.at(-1);
  if (blocco) {
    for (const f of blocco.funzioni) {
      const c = f.castellammare;
      const scarto = c.differenzaPuntiBase / 100;
      if (scarto < SOGLIE.sopraStandard) continue;
      const serviziBassi = c.livelloServizi !== null && c.livelloServizi <= SOGLIE.serviziBassi;
      out.push({
        id: `sopra-standard-${f.id}`,
        area: "Spesa",
        titolo: serviziBassi ? `${f.voce}: si spende di più, ma i servizi sono bassi` : `${f.voce}: si spende molto più dello standard`,
        dato: `${euro(c.storicaPerAbitanteCentesimi / 100)} per abitante nel ${blocco.anno}`,
        confronto: `standard ${euro(c.standardPerAbitanteCentesimi / 100)} (${percentualeConSegno(scarto)})${serviziBassi ? ` · servizi ${numero(c.livelloServizi)}/10` : ""}`,
        spiegazione: `La spesa standard è la stima dello Stato per un Comune con le stesse caratteristiche. Se il Comune spende di più, chi amministra dovrebbe spiegare perché.${
          serviziBassi ? ` Qui però il livello dei servizi è ${numero(c.livelloServizi)}/10 rispetto ai Comuni della stessa dimensione.` : ""
        }`,
        domanda: DOMANDE_SOPRA[f.id] ?? `Cosa spiega la spesa sopra lo standard per ${f.voce.toLowerCase()}?`,
        fonte: `OpenCivitas ${blocco.anno}`,
        link: "/comune",
      });
    }

    const sotto = blocco.funzioni
      .filter((f) => f.castellammare.differenzaPuntiBase / 100 <= SOGLIE.sottoStandard)
      .sort((a, b) => a.castellammare.differenzaPuntiBase - b.castellammare.differenzaPuntiBase);
    if (sotto.length > 0) {
      out.push({
        id: "sotto-standard",
        area: "Spesa",
        titolo: "Per alcuni servizi si spende molto meno del necessario",
        dato: sotto.map((f) => `${breve(f)} ${percentualeConSegno(f.castellammare.differenzaPuntiBase / 100)}`).join(" · "),
        confronto: `rispetto al fabbisogno standard, ${blocco.anno}`,
        spiegazione: "Una spesa sotto lo standard spesso corrisponde a servizi ridotti o assenti.",
        domanda: `Quali servizi mancano o sono ridotti per ${elenco(sotto.map(breve))}?`,
        fonte: `OpenCivitas ${blocco.anno}`,
        link: "/comune",
      });
    }
  }

  // ---------------------------------------------------------------- SIOPE
  const anniCompleti = [...new Set(d.siope.anni.filter((a) => a.completo).map((a) => a.anno))].sort((a, b) => a - b);
  const ultimo = anniCompleti.at(-1);
  const precedente = anniCompleti.at(-2);
  const ente = (tipo: "pagamenti" | "incassi", anno: number | undefined) => d.siope.anni.find((a) => a.tipo === tipo && a.anno === anno)?.castellammare;

  const tribNow = ente("incassi", ultimo);
  const tribPrev = ente("incassi", precedente);
  if (tribNow && tribPrev) {
    const nuovo = titolo(tribNow, "1");
    const vecchio = titolo(tribPrev, "1");
    const v = variazione(nuovo, vecchio);
    if (v <= SOGLIE.caloTributi) {
      out.push({
        id: "tributi-in-calo",
        area: "Entrate",
        titolo: "I tributi incassati sono calati",
        dato: `${euroMln(nuovo)} incassati nel ${ultimo}`,
        confronto: `${euroMln(vecchio)} nel ${precedente} (${percentualeConSegno(v)})`,
        spiegazione:
          "Sono incassi di cassa (IMU, TARI, addizionale, fondo di solidarietà): un calo può dipendere da tributi più bassi, da ritardi nella riscossione o da incassi spostati da un anno all'altro.",
        domanda: "Perché i tributi incassati sono calati, e quanto resta ancora da riscuotere?",
        fonte: `SIOPE ${precedente}-${ultimo}`,
        link: "/comune",
      });
    }
  }

  const pag = ente("pagamenti", ultimo);
  const inc = ente("incassi", ultimo);
  if (pag && inc) {
    const p = totaleProprio(pag, "pagamenti");
    const i = totaleProprio(inc, "incassi");
    if (p > i) {
      out.push({
        id: "cassa-negativa",
        area: "Entrate",
        titolo: `Nel ${ultimo} il Comune ha pagato più di quanto ha incassato`,
        dato: `${euroMln(p)} pagati, ${euroMln(i)} incassati`,
        confronto: `differenza ${euroMln(p - i)}, al netto delle partite di giro`,
        spiegazione:
          "Il Comune può coprire la differenza con la cassa degli anni precedenti o con fondi già ricevuti, per esempio per il PNRR. Per capire se c'è un buco serve il rendiconto.",
        domanda: `Con quali risorse è stata coperta la differenza del ${ultimo}, e quanta cassa resta?`,
        fonte: `SIOPE ${ultimo}`,
        link: "/comune",
      });
    }
  }

  // ---------------------------------------------------------------- PNRR
  const rif = daGgMmAaaa(d.pnrr.dataEstrazione ?? "");
  if (rif) {
    const ritardo = d.pnrr.progetti.filter((p) => {
      const fine = daGgMmAaaa(p.finePrevista);
      return p.stato === "In Corso" && fine !== null && fine < rif;
    });
    if (ritardo.length > 0) {
      const delComune = ritardo.filter((p) => /COMUNE DI CASTELLAMMARE/i.test(p.soggettoAttuatore));
      const valore = ritardo.reduce((a, p) => a + (p.finanziamentoAttribuitoCentesimi ?? 0), 0) / 100;
      out.push({
        id: "pnrr-in-ritardo",
        area: "PNRR",
        titolo: "Progetti PNRR non conclusi entro la data prevista",
        dato: `${numero(ritardo.length)} progetti in corso oltre la scadenza prevista, per ${euroMln(valore)}`,
        confronto: `alla data della fonte (${data(rif)}) · ${delComune.length} del Comune`,
        spiegazione:
          "Il PNRR ha scadenze stringenti: un progetto che non si chiude in tempo rischia di perdere il finanziamento. Lo stato è quello comunicato da chi gestisce il progetto, che può aggiornarlo in ritardo.",
        domanda: "A che punto sono i progetti in ritardo, a partire da quelli del Comune, e i fondi sono al sicuro?",
        fonte: "Italia Domani · ReGiS",
        link: "/pnrr",
      });
    }
  }

  // ---------------------------------------------------------------- Fondi di coesione
  const oc = d.opencoesione;
  if (oc?.dataDati) {
    // Solo progetti localizzati unicamente in città: gli altri non hanno una quota attribuibile.
    const ritardo = oc.progetti.filter((p) => p.comuni === 1 && p.stato === "In corso" && p.finePrevista !== null && p.finePrevista < oc.dataDati!);
    if (ritardo.length > 0) {
      const somma = (l: typeof ritardo, k: "finanziamentoCentesimi" | "pagamentiCentesimi") => l.reduce((a, p) => a + (p[k] ?? 0), 0) / 100;
      const delComune = ritardo.filter((p) => p.delComune);
      out.push({
        id: "coesione-in-ritardo",
        area: "Fondi europei",
        titolo: "Progetti finanziati con fondi europei e nazionali ancora aperti oltre la scadenza",
        dato: `${numero(ritardo.length)} progetti ancora in corso oltre la fine prevista, per ${euroMln(somma(ritardo, "finanziamentoCentesimi"))} (pagati ${euroMln(somma(ritardo, "pagamentiCentesimi"))})`,
        confronto: `dati al ${data(oc.dataDati)} · ${numero(delComune.length)} del Comune (${euroMln(somma(delComune, "finanziamentoCentesimi"))})`,
        spiegazione:
          "Alcuni dovevano finire molti anni fa. O i lavori sono fermi, o chi gestisce il progetto non ha aggiornato i dati: in entrambi i casi chi amministra deve chiarirlo.",
        domanda: "Quali di questi progetti sono fermi, quali sono conclusi ma non aggiornati, e che fine hanno fatto i soldi non spesi?",
        fonte: "OpenCoesione",
        link: "/fondi-europei",
      });
    }
  }

  // ---------------------------------------------------------------- Pagamenti ai fornitori
  const cmPag = d.pagamenti?.comuni.find((c) => c.ipa === "c_c129");
  const ultimoTempi = cmPag?.tempi.filter((t) => t.completo && t.ritardoGiorni !== null).at(-1);
  if (ultimoTempi && (ultimoTempi.ritardoGiorni ?? 0) > SOGLIE.ritardoPagamenti) {
    out.push({
      id: "pagamenti-in-ritardo",
      area: "Entrate",
      titolo: "Il Comune paga i fornitori in ritardo",
      dato: `in media ${numero(Math.round(ultimoTempi.ritardoGiorni!))} giorni dopo la scadenza nel ${ultimoTempi.periodo}`,
      confronto: `tempo medio di pagamento ${numero(Math.round(ultimoTempi.pagamentoGiorni ?? 0))} giorni`,
      spiegazione: "Pagare in ritardo costa interessi di mora e indica spesso problemi di cassa.",
      domanda: "Perché le fatture vengono pagate dopo la scadenza, e quanto costano gli interessi di ritardo?",
      fonte: "MEF-RGS · Piattaforma crediti commerciali",
      link: "/comune#pagamenti",
    });
  }

  // ---------------------------------------------------------------- Personale
  const dip = d.personale.dipendenti;
  if (dip.length >= 2) {
    const primo = dip[0];
    const ultimoDip = dip.at(-1)!;
    const v = variazione(ultimoDip.tempoIndeterminato, primo.tempoIndeterminato);
    if (v <= SOGLIE.caloPersonale) {
      out.push({
        id: "personale-in-calo",
        area: "Personale",
        titolo: v <= -40 ? "Il personale del Comune si è quasi dimezzato" : "Il personale del Comune è in forte calo",
        dato: `${numero(ultimoDip.tempoIndeterminato)} dipendenti stabili nel ${ultimoDip.anno}`,
        confronto: `erano ${numero(primo.tempoIndeterminato)} nel ${primo.anno} (${percentualeConSegno(v)})`,
        spiegazione: "Meno personale può voler dire uffici più lenti, meno controlli e più servizi affidati all'esterno.",
        domanda: "Quali uffici sono sotto organico e quali servizi sono stati affidati all'esterno?",
        fonte: `RGS Conto annuale ${primo.anno}-${ultimoDip.anno}`,
        link: "/personale",
      });
    }
  }

  // ---------------------------------------------------------------- Patrimonio
  const fermi = d.patrimonio.fabbricatiFermi.filter((f) => /CASTELLAMMARE/i.test(f.ente));
  const nonUsati = fermi.filter((f) => f.utilizzo === "Non utilizzato").reduce((a, f) => a + (f.fabbricati ?? 0), 0);
  const inutilizzabili = fermi.filter((f) => f.utilizzo === "Inutilizzabile").reduce((a, f) => a + (f.fabbricati ?? 0), 0);
  if (nonUsati + inutilizzabili > 0) {
    out.push({
      id: "immobili-vuoti",
      area: "Patrimonio",
      titolo: "Edifici del Comune fermi",
      dato: `${numero(nonUsati + inutilizzabili)} fabbricati non utilizzati o inutilizzabili`,
      confronto: `${numero(nonUsati)} non utilizzati e ${numero(inutilizzabili)} inutilizzabili, censimento 2023`,
      spiegazione: "Un immobile pubblico fermo non produce servizi né entrate, e spesso costa in manutenzione e sicurezza.",
      domanda: "Quali sono questi immobili e cosa si intende farne: riuso, affitto o vendita?",
      fonte: "MEF · censimento immobili pubblici 2023",
      link: "/patrimonio",
    });
  }

  // ---------------------------------------------------------------- Contesto
  const medio = redditoMedio(d.irpef.castellammare);
  const italia = redditoMedio(d.irpef.italia);
  const v = variazione(medio, italia);
  if (v <= SOGLIE.redditoSottoItalia) {
    out.push({
      id: "redditi-bassi",
      area: "Contesto",
      titolo: "I redditi in città sono più bassi della media italiana",
      dato: `${euro(medio)} di reddito medio dichiarato nel ${d.irpef.annoImposta}`,
      confronto: `in Italia ${euro(italia)} (${percentualeConSegno(v)})`,
      spiegazione: "Dai redditi dipendono quanto può incassare il Comune e quanti servizi sociali servono in città.",
      domanda: "Come tiene conto il bilancio comunale dei redditi bassi, tra esenzioni, tariffe e servizi sociali?",
      fonte: `MEF · redditi ${d.irpef.annoImposta}`,
      link: "/redditi",
    });
  }

  return out;
}

/**
 * Il rovescio dello specchietto: punti in cui i dati dicono che il Comune va
 * bene. Stesse regole fisse, per non mostrare solo ciò che non va.
 */
export function calcolaCoseCheVanno(d: DatiSegnali): Segnale[] {
  const out: Segnale[] = [];
  const cm = d.pagamenti?.comuni.find((c) => c.ipa === "c_c129");
  if (!cm) return out;

  const ultimo = cm.tempi.filter((t) => t.completo && t.ritardoGiorni !== null).at(-1);
  if (ultimo && (ultimo.ritardoGiorni ?? 0) < 0) {
    const vicini = d.pagamenti!.comuni.filter((c) => c.ipa !== "c_c129").map((c) => c.tempi.find((t) => t.periodo === ultimo.periodo)?.ritardoGiorni);
    const piuLenti = vicini.filter((v) => v !== null && v !== undefined && v > ultimo.ritardoGiorni!).length;
    out.push({
      id: "paga-in-anticipo",
      area: "Pagamenti",
      titolo: "Il Comune paga i fornitori prima della scadenza",
      dato: `in media ${numero(Math.round(-ultimo.ritardoGiorni!))} giorni prima della scadenza nel ${ultimo.periodo}`,
      confronto: `tempo medio di pagamento ${numero(Math.round(ultimo.pagamentoGiorni ?? 0))} giorni · più puntuale di ${piuLenti} Comuni vicini su ${vicini.length}`,
      spiegazione: "Pagare in tempo evita interessi di mora e rende il Comune un cliente affidabile per le imprese.",
      domanda: "Come si mantiene questa puntualità anche con meno personale?",
      fonte: "MEF-RGS · Piattaforma crediti commerciali",
      link: "/comune#pagamenti",
    });
  }

  const debiti = cm.debito.filter((x) => x.completo && x.centesimi !== null);
  if (debiti.length >= 2) {
    const primo = debiti[0];
    const ultimoD = debiti.at(-1)!;
    const v = variazione(ultimoD.centesimi!, primo.centesimi!);
    if (v <= SOGLIE.caloDebito) {
      out.push({
        id: "debito-commerciale-in-calo",
        area: "Pagamenti",
        titolo: "I debiti scaduti verso i fornitori sono calati molto",
        dato: `${euroMln(ultimoD.centesimi! / 100)} al ${ultimoD.periodo}`,
        confronto: `erano ${euroMln(primo.centesimi! / 100)} al ${primo.periodo} (${percentualeConSegno(v)})`,
        spiegazione: "È il totale delle fatture scadute e non ancora pagate, come comunicato alla piattaforma nazionale.",
        domanda: "Quanto resta dei debiti più vecchi, e ci sono contenziosi aperti con i fornitori?",
        fonte: "MEF-RGS · Piattaforma crediti commerciali",
        link: "/comune#pagamenti",
      });
    }
  }
  return out;
}

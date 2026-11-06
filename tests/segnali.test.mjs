// Lo specchietto "Cosa non va" è calcolato dai dati con regole fisse:
// questi test fissano le regole e i numeri attesi sui dati reali.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { calcolaCoseCheVanno, calcolaSegnali } from "../src/lib/segnali.ts";

const load = (name) => JSON.parse(readFileSync(new URL(`../src/data/castellammare/${name}.json`, import.meta.url), "utf8"));
const dati = () => ({
  opencivitas: load("opencivitas"),
  siope: load("siope"),
  personale: load("personale"),
  patrimonio: load("patrimonio"),
  pnrr: load("pnrr"),
  irpef: load("irpef"),
  pagamenti: load("pagamenti"),
  opencoesione: load("opencoesione"),
});
const byId = (segnali, id) => segnali.find((s) => s.id === id);

test("ogni punto ha titolo, dato, confronto, spiegazione, domanda, fonte e pagina, senza buchi", () => {
  const segnali = calcolaSegnali(dati());
  assert.ok(segnali.length >= 8, `solo ${segnali.length} punti`);
  for (const s of segnali) {
    for (const k of ["id", "area", "titolo", "dato", "confronto", "spiegazione", "domanda", "fonte", "link"]) {
      assert.ok(typeof s[k] === "string" && s[k].length > 0, `${s.id}: ${k} vuoto`);
    }
    assert.doesNotMatch(`${s.dato} ${s.confronto} ${s.titolo}`, /NaN|undefined|Non disponibile/, s.id);
    assert.match(s.link, /^\//, `${s.id}: il link deve essere una pagina del sito`);
  }
  assert.equal(new Set(segnali.map((s) => s.id)).size, segnali.length, "id duplicati");
});

test("spesa molto sopra lo standard: uffici e amministrazione +130%", () => {
  const s = byId(calcolaSegnali(dati()), "sopra-standard-amministrazione");
  assert.ok(s);
  assert.match(s.dato, /203\s€/);
  assert.match(s.confronto, /88\s€/);
  assert.match(s.confronto, /\+130%/);
});

test("rifiuti: si spende più dello standard ma il livello dei servizi è basso", () => {
  const s = byId(calcolaSegnali(dati()), "sopra-standard-rifiuti");
  assert.ok(s);
  assert.match(s.confronto, /\+17%/);
  assert.match(s.dato + s.confronto + s.spiegazione, /2\/10/);
});

test("spesa molto sotto lo standard: scuole, strade e sociale in un solo punto", () => {
  const s = byId(calcolaSegnali(dati()), "sotto-standard");
  assert.ok(s);
  for (const parola of [/scuole/i, /strade/i, /sociale/i]) assert.match(s.dato, parola);
  assert.doesNotMatch(s.dato, /polizia/i, "−18% non supera la soglia del −30%");
});

test("servizi complessivi bassi", () => {
  const s = byId(calcolaSegnali(dati()), "servizi-bassi");
  assert.ok(s);
  assert.match(s.dato, /1\/10/);
});

test("personale stabile quasi dimezzato dal 2010", () => {
  const s = byId(calcolaSegnali(dati()), "personale-in-calo");
  assert.ok(s);
  assert.match(s.dato, /237/);
  assert.match(s.confronto, /458/);
});

test("edifici del Comune non utilizzati o inutilizzabili", () => {
  const s = byId(calcolaSegnali(dati()), "immobili-vuoti");
  assert.ok(s);
  assert.match(s.dato, /\b52\b/);
});

test("tributi incassati in calo tra gli ultimi due anni completi", () => {
  const s = byId(calcolaSegnali(dati()), "tributi-in-calo");
  assert.ok(s);
  assert.match(s.dato, /45,5\smln\s€/);
  assert.match(s.confronto, /51,2\smln\s€/);
});

test("PNRR: i ritardi si misurano alla data di estrazione della fonte, non a oggi", () => {
  const s = byId(calcolaSegnali(dati()), "pnrr-in-ritardo");
  assert.ok(s);
  assert.match(s.dato, /\b46 progetti\b/);
  assert.match(s.dato + s.confronto, /2 del Comune/);
  assert.match(s.confronto, /13 giugno 2026/);
});

test("le regole hanno soglie: uno scostamento piccolo non diventa un punto critico", () => {
  const d = dati();
  const blocco = d.opencivitas.funzioni.find((f) => f.anno === 2022);
  const amm = blocco.funzioni.find((f) => f.id === "amministrazione").castellammare;
  amm.differenzaPuntiBase = 1000; // +10%
  amm.storicaPerAbitanteCentesimi = Math.round(amm.standardPerAbitanteCentesimi * 1.1);
  d.personale.dipendenti.at(-1).tempoIndeterminato = d.personale.dipendenti[0].tempoIndeterminato - 10;
  const segnali = calcolaSegnali(d);
  assert.equal(byId(segnali, "sopra-standard-amministrazione"), undefined);
  assert.equal(byId(segnali, "personale-in-calo"), undefined);
});

test("fondi di coesione: progetti solo in città ancora in corso oltre la fine prevista, alla data dei dati", () => {
  const s = byId(calcolaSegnali(dati()), "coesione-in-ritardo");
  assert.ok(s);
  assert.match(s.dato, /\b161 progetti\b/);
  assert.match(s.confronto, /24 del Comune/);
  assert.match(s.confronto, /31 agosto 2026/);
});

test("pagamenti ai fornitori: Castellammare paga prima della scadenza, quindi nessun punto critico ma un punto positivo", () => {
  const d = dati();
  assert.equal(byId(calcolaSegnali(d), "pagamenti-in-ritardo"), undefined);
  const bene = calcolaCoseCheVanno(d);
  const p = bene.find((x) => x.id === "paga-in-anticipo");
  assert.ok(p);
  assert.match(p.dato, /18 giorni prima della scadenza/);
  const debito = bene.find((x) => x.id === "debito-commerciale-in-calo");
  assert.ok(debito);
  assert.match(debito.confronto, /8,4\smln\s€/);
});

test("se il Comune pagasse in ritardo, comparirebbe tra i punti critici", () => {
  const d = dati();
  const cm = d.pagamenti.comuni.find((c) => c.ipa === "c_c129");
  for (const t of cm.tempi) t.ritardoGiorni = 25;
  const s = byId(calcolaSegnali(d), "pagamenti-in-ritardo");
  assert.ok(s);
  assert.match(s.dato, /25 giorni/);
  assert.equal(calcolaCoseCheVanno(d).find((x) => x.id === "paga-in-anticipo"), undefined);
});

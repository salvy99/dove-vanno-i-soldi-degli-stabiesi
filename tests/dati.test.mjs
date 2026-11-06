// Controlli di coerenza sui dati estratti in src/data/castellammare.
// Se uno di questi fallisce dopo una nuova estrazione, la fonte è cambiata:
// non pubblicare finché non è chiaro perché.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const dir = new URL("../src/data/castellammare/", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(`${name}.json`, dir), "utf8"));

test("ogni file dichiara fonte, link, licenza, periodo e provenienza", () => {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const d = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
    assert.ok(d.fonte?.ente, `${file}: ente mancante`);
    assert.match(d.fonte?.url ?? "", /^https:\/\//, `${file}: link alla fonte mancante`);
    assert.ok(d.fonte?.licenza, `${file}: licenza mancante`);
    assert.ok(d.fonte?.periodo, `${file}: periodo mancante`);
    // Provenienza: o il commit del repository originale, o i file ufficiali scaricati con la loro impronta.
    const daUpstream = /^[0-9a-f]{40}$/.test(d.estratto?.commit ?? "");
    const daFonte = (d.estratto?.file ?? []).some((f) => /^https:\/\//.test(f.url ?? "") && /^[0-9a-f]{64}$/.test(f.sha256 ?? ""));
    assert.ok(daUpstream || daFonte, `${file}: provenienza mancante`);
  }
});

test("SIOPE: per ogni anno i titoli riconciliano col totale, per Castellammare e per i Comuni di confronto", () => {
  const { anni } = load("siope");
  assert.ok(anni.length >= 4);
  for (const y of anni) {
    for (const c of [y.castellammare, ...y.confronto]) {
      const somma = c.perTitolo.reduce((a, t) => a + (t.centesimi ?? 0), 0);
      assert.equal(somma, c.totaleCentesimi, `${y.tipo} ${y.anno} ${c.nome}`);
    }
    assert.equal(y.castellammare.codiceFiscale, "82000270635");
  }
});

test("OpenCivitas: le sei funzioni sommano al totale per abitante (scontrino coerente)", () => {
  const oc = load("opencivitas");
  for (const { anno, funzioni } of oc.funzioni) {
    const tot = oc.serie.find((s) => s.anno === anno)?.castellammare;
    assert.ok(tot, `totale ${anno} mancante`);
    const somma = funzioni.reduce((a, f) => a + f.castellammare.storicaPerAbitanteCentesimi, 0);
    // Gli arrotondamenti della fonte possono differire di qualche centesimo.
    assert.ok(Math.abs(somma - tot.storicaPerAbitanteCentesimi) <= 10, `${anno}: ${somma} vs ${tot.storicaPerAbitanteCentesimi}`);
  }
});

test("PNRR: ogni progetto è localizzato a Castellammare e la quota attribuita non supera il totale", () => {
  const { progetti } = load("pnrr");
  assert.ok(progetti.length > 100);
  const cups = new Set();
  for (const p of progetti) {
    assert.ok(p.quotaPercentuale > 0 && p.quotaPercentuale <= 100, `${p.cup}: quota ${p.quotaPercentuale}`);
    assert.ok(p.finanziamentoAttribuitoCentesimi <= p.finanziamentoTotaleCentesimi, p.cup);
    cups.add(`${p.cup}|${p.titolo}|${p.soggettoAttuatore}`);
  }
  assert.equal(cups.size, progetti.length, "righe duplicate");
});

test("Personale: serie annuale senza buchi e solo del Comune", () => {
  const { dipendenti } = load("personale");
  const anni = dipendenti.map((d) => d.anno);
  assert.deepEqual(anni, Array.from({ length: anni.length }, (_, i) => anni[0] + i));
  for (const d of dipendenti) assert.ok(d.tempoIndeterminato > 100 && d.tempoIndeterminato < 1000, `${d.anno}`);
});

test("Appalti: il totale aggiudicato è la somma delle aggiudicazioni del Comune", () => {
  const a = load("appalti");
  const somma = a.aggiudicazioni.reduce((s, x) => s + (x.importoCentesimi ?? 0), 0);
  assert.equal(somma, Math.round(Number(a.riepilogo.awardValue) * 100));
  assert.equal(a.aggiudicazioni.length, a.riepilogo.awardCount);
});

test("IRPEF: Castellammare e tutti i Comuni di confronto presenti con i contribuenti", () => {
  const i = load("irpef");
  assert.equal(i.castellammare.istat, "063024");
  assert.equal(i.confronto.length, 12);
  for (const c of [i.castellammare, ...i.confronto]) assert.ok(c.contribuenti > 1000, c.nome);
});

test("Tempi di pagamento: Castellammare e i 12 Comuni, con almeno due anni interi", () => {
  const p = load("pagamenti");
  assert.equal(p.comuni.length, 13);
  const cm = p.comuni.find((c) => c.ipa === "c_c129");
  assert.ok(cm.tempi.filter((t) => t.completo).length >= 2);
  for (const t of cm.tempi) assert.ok(Number.isFinite(t.ritardoGiorni) && Number.isFinite(t.pagamentoGiorni), t.periodo);
  assert.ok(cm.debito.length >= 2);
});

test("OpenCoesione: progetti solo pubblicati, localizzati in città, senza codici duplicati", () => {
  const o = load("opencoesione");
  assert.ok(o.progetti.length > 1000);
  assert.equal(new Set(o.progetti.map((p) => p.codice)).size, o.progetti.length);
  for (const p of o.progetti) {
    assert.ok(p.comuni >= 1, p.codice);
    assert.ok((p.pagamentiCentesimi ?? 0) >= 0, p.codice);
  }
  assert.match(o.dataDati, /^\d{4}-\d{2}-\d{2}$/);
});

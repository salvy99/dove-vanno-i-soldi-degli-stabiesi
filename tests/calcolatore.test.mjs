// Verifica la stima delle imposte sul reddito 2026 per un residente a
// Castellammare di Stabia. I valori attesi sono calcolati a mano dalle norme
// citate in src/lib/regole-fiscali-2026.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import { stimaImposte } from "../src/lib/calcolatore.ts";

const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 0.01, `${label}: atteso ${expected}, ottenuto ${actual}`);

test("dipendente con 22.500 €: scaglione 23%, detrazione lavoro e ulteriore detrazione di 1.000 €", () => {
  const r = stimaImposte({ reddito: 22500, tipo: "dipendente" });
  close(r.irpefLorda, 5175, "IRPEF lorda");
  close(r.detrazioni, 2413.46 + 1000, "detrazioni");
  close(r.stato, 1761.54, "IRPEF netta allo Stato");
  close(r.regione, 481.5, "addizionale regionale Campania");
  close(r.comune, 157.5, "addizionale comunale 0,7%");
  close(r.totale, 2400.54, "totale");
});

test("dipendente con 35.000 €: secondo scaglione al 33%, maggiorazione di 65 € e detrazione ridotta", () => {
  const r = stimaImposte({ reddito: 35000, tipo: "dipendente" });
  close(r.irpefLorda, 8750, "IRPEF lorda");
  close(r.detrazioni, 1367.27 + 625, "detrazioni");
  close(r.stato, 6757.73, "IRPEF netta");
  close(r.regione, 868.3, "addizionale regionale");
  close(r.comune, 245, "addizionale comunale");
});

test("pensionato con 12.000 €", () => {
  const r = stimaImposte({ reddito: 12000, tipo: "pensionato" });
  close(r.irpefLorda, 2760, "IRPEF lorda");
  close(r.detrazioni, 1729.74, "detrazione pensione");
  close(r.stato, 1030.26, "IRPEF netta");
  close(r.regione, 207.6, "addizionale regionale");
  close(r.comune, 84, "addizionale comunale");
});

test("autonomo con 60.000 €: nessuna detrazione oltre 50.000 € e tutti gli scaglioni regionali", () => {
  const r = stimaImposte({ reddito: 60000, tipo: "autonomo" });
  close(r.irpefLorda, 18000, "IRPEF lorda");
  close(r.detrazioni, 0, "detrazioni");
  close(r.stato, 18000, "IRPEF netta");
  close(r.regione, 1681.3, "addizionale regionale");
  close(r.comune, 420, "addizionale comunale");
});

test("se l'IRPEF netta è zero non si pagano neppure le addizionali", () => {
  const r = stimaImposte({ reddito: 8000, tipo: "dipendente" });
  assert.equal(r.stato, 0);
  assert.equal(r.regione, 0);
  assert.equal(r.comune, 0);
  assert.equal(r.totale, 0);
});

test("la soglia comunale di 10.000 € è un'esenzione, non una franchigia", () => {
  assert.equal(stimaImposte({ reddito: 10000, tipo: "dipendente" }).comune, 0);
  // Appena sopra la soglia l'aliquota si applica all'intero reddito.
  close(stimaImposte({ reddito: 10001, tipo: "dipendente" }).comune, 70.01, "addizionale comunale");
});

test("input non validi danno zero, mai NaN", () => {
  for (const reddito of [-5, Number.NaN, 0]) {
    const r = stimaImposte({ reddito, tipo: "dipendente" });
    assert.equal(r.totale, 0);
    assert.ok(Object.values(r).every((v) => typeof v !== "number" || Number.isFinite(v)));
  }
});

// ---------------------------------------------------------------- TARI e IMU 2026
import { stimaImu, stimaTari } from "../src/lib/calcolatore.ts";

test("TARI: 80 m², 3 persone = quota fissa + quota variabile, più TEFA 5% e componenti ARERA", () => {
  const t = stimaTari({ mq: 80, persone: 3 });
  close(t.tari, 80 * 2.1944 + 299.156117, "TARI comunale");
  close(t.tefa, (80 * 2.1944 + 299.156117) * 0.05, "TEFA Città metropolitana");
  close(t.arera, 7.6, "componenti perequative UR1+UR2+UR3");
  close(t.totale, 506.04, "totale bolletta");
});

test("TARI: una persona in 50 m²", () => {
  close(stimaTari({ mq: 50, persone: 1 }).totale, 203.79, "totale");
});

test("TARI: da 6 persone in su la tariffa è la stessa", () => {
  assert.equal(stimaTari({ mq: 100, persone: 9 }).totale, stimaTari({ mq: 100, persone: 6 }).totale);
});

test("TARI: senza metri quadri non si stima nulla", () => {
  assert.equal(stimaTari({ mq: 0, persone: 2 }).totale, 0);
  assert.equal(stimaTari({ mq: Number.NaN, persone: 2 }).totale, 0);
});

test("IMU seconda casa: rendita × 1,05 × 160 × 1,06%", () => {
  close(stimaImu({ rendita: 500, tipo: "seconda-casa" }), 890.4, "IMU");
});

test("IMU abitazione principale di lusso: 0,6% meno 200 € di detrazione", () => {
  close(stimaImu({ rendita: 2000, tipo: "principale-lusso" }), 1816, "IMU");
  assert.equal(stimaImu({ rendita: 100, tipo: "principale-lusso" }), 0, "la detrazione non rende l'imposta negativa");
});

test("IMU: casa in comodato a figli o genitori, base imponibile dimezzata", () => {
  close(stimaImu({ rendita: 500, tipo: "comodato" }), 445.2, "IMU");
});

test("IMU: rendita assente o non valida dà zero", () => {
  assert.equal(stimaImu({ rendita: 0, tipo: "seconda-casa" }), 0);
  assert.equal(stimaImu({ rendita: -3, tipo: "seconda-casa" }), 0);
});

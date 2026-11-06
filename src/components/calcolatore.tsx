"use client";

import { useId, useState } from "react";
import { BarList } from "@/components/bar-list";
import { stimaImposte, stimaImu, stimaTari, type TipoImmobile, type TipoReddito } from "@/lib/calcolatore";
import { euro } from "@/lib/format";
import { ANNO_FISCALE } from "@/lib/regole-fiscali-2026";

type Quota = { id: string; voce: string; quota: number };

const TIPI: [TipoReddito, string][] = [
  ["dipendente", "Dipendente"],
  ["pensionato", "Pensionato"],
  ["autonomo", "Autonomo / altro"],
];

const IMMOBILI: [TipoImmobile, string][] = [
  ["seconda-casa", "Seconda casa o casa affittata"],
  ["comodato", "Casa data in uso gratuito a figli o genitori"],
  ["principale-lusso", "Abitazione principale di lusso (A/1, A/8, A/9)"],
];

function leggiImporto(s: string): number {
  // Accetta "22.500", "22500", "22 500" e "22500,50".
  const pulito = s.replace(/[\s.€]/g, "").replace(",", ".");
  const n = Number(pulito);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000_000) : 0;
}

export function Calcolatore({ redditoIniziale, quoteComune, annoScontrino }: { redditoIniziale: number; quoteComune: Quota[]; annoScontrino: number }) {
  const id = useId();
  const [testo, setTesto] = useState(new Intl.NumberFormat("it-IT", { useGrouping: "always" }).format(redditoIniziale));
  const [tipo, setTipo] = useState<TipoReddito>("dipendente");
  const [mq, setMq] = useState("");
  const [persone, setPersone] = useState(2);
  const [rendita, setRendita] = useState("");
  const [immobile, setImmobile] = useState<TipoImmobile>("seconda-casa");

  const reddito = leggiImporto(testo);
  const s = stimaImposte({ reddito, tipo });
  const tari = stimaTari({ mq: leggiImporto(mq), persone });
  const imu = stimaImu({ rendita: leggiImporto(rendita), tipo: immobile });
  const conCasa = tari.totale > 0 || imu > 0;

  // I totali mostrati sono somme di parti arrotondate: le cifre a schermo tornano sempre.
  const r = Math.round;
  const totaleReddito = r(s.stato) + r(s.regione) + r(s.comune);
  const alComune = r(s.comune) + r(tari.tari) + r(imu);
  // TEFA va alla Città metropolitana, le componenti ARERA a un fondo nazionale: non al Comune.
  const altriEnti = r(tari.tefa) + r(tari.arera);
  const totale = totaleReddito + r(tari.tari) + r(tari.tefa) + r(tari.arera) + r(imu);
  // L'addizionale e l'IMU entrano nel bilancio generale; la TARI paga il servizio rifiuti.
  const generale = s.comune + imu;

  return (
    <div className="calc">
      <form className="calc-form" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor={`${id}-reddito`}>Il tuo reddito imponibile annuo</label>
          <input
            id={`${id}-reddito`}
            className="input"
            inputMode="decimal"
            autoComplete="off"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            aria-describedby={`${id}-hint`}
          />
          <span id={`${id}-hint`} className="hint">
            È il lordo meno i contributi: lo trovi nella Certificazione Unica. Parte dal reddito medio di chi vive a Castellammare.
          </span>
        </div>
        <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend>Che tipo di reddito è?</legend>
          <div className="segmented">
            {TIPI.map(([value, label]) => (
              <label key={value}>
                <input type="radio" name={`${id}-tipo`} value={value} checked={tipo === value} onChange={() => setTipo(value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      <details className="more casa" open={conCasa || undefined}>
        <summary>Hai una casa? Aggiungi TARI e IMU</summary>
        <div className="calc-form">
          <div className="field">
            <label htmlFor={`${id}-mq`}>Metri quadri della casa in cui vivi</label>
            <input id={`${id}-mq`} className="input" inputMode="decimal" autoComplete="off" placeholder="es. 80" value={mq} onChange={(e) => setMq(e.target.value)} />
            <span className="hint">Superficie calpestabile, per la TARI (rifiuti).</span>
          </div>
          <div className="field">
            <label htmlFor={`${id}-persone`}>Persone in famiglia</label>
            <select id={`${id}-persone`} className="input" value={persone} onChange={(e) => setPersone(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n === 6 ? "6 o più" : n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${id}-rendita`}>Rendita catastale di un&apos;altra casa</label>
            <input id={`${id}-rendita`} className="input" inputMode="decimal" autoComplete="off" placeholder="es. 500" value={rendita} onChange={(e) => setRendita(e.target.value)} />
            <span className="hint">Per l&apos;IMU: la trovi nella visura catastale. La prima casa (non di lusso) non paga.</span>
          </div>
          <div className="field">
            <label htmlFor={`${id}-immobile`}>Che casa è?</label>
            <select id={`${id}-immobile`} className="input" value={immobile} onChange={(e) => setImmobile(e.target.value as TipoImmobile)}>
              {IMMOBILI.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      <div className="calc-result" aria-live="polite">
        <p className="calc-total">
          Ogni anno versi, in stima, circa
          <strong className="num">{euro(totale)}</strong>
          {conCasa ? "fra imposte sul reddito e tributi sulla casa, così divisi:" : "di imposte sul reddito, così divise:"}
        </p>
        <BarList
          label="Divisione delle imposte"
          max={Math.max(s.stato, s.regione, alComune, 1)}
          items={[
            { id: "stato", label: "Allo Stato · IRPEF", value: s.stato, display: euro(s.stato), sub: `IRPEF lorda ${euro(s.irpefLorda)} meno ${euro(Math.min(s.detrazioni, s.irpefLorda))} di detrazioni` },
            { id: "regione", label: "Alla Regione Campania · addizionale regionale", value: s.regione, display: euro(s.regione), sub: "Da 1,73% a 3,33% a scaglioni" },
            {
              id: "comune",
              label: conCasa ? "Al Comune di Castellammare · addizionale, TARI e IMU" : "Al Comune di Castellammare · addizionale comunale",
              value: alComune,
              display: euro(alComune),
              alt: true,
              sub: conCasa
                ? `Addizionale ${euro(s.comune)} · TARI ${euro(tari.tari)} · IMU ${euro(imu)}`
                : "0,7%, esente fino a 10.000 €",
            },
            ...(altriEnti > 0
              ? [
                  {
                    id: "tefa",
                    label: "Alla Città metropolitana e al fondo nazionale ARERA",
                    value: altriEnti,
                    display: euro(altriEnti),
                    sub: `TEFA ${euro(tari.tefa)} (5% della TARI) · componenti ARERA ${euro(tari.arera, true)}, nella stessa bolletta`,
                  },
                ]
              : []),
          ]}
        />

        {tari.totale > 0 && (
          <p className="callout">
            La tua bolletta TARI stimata è di <strong>{euro(tari.totale, true)}</strong> l&apos;anno: {euro(tari.tari, true)} di tariffa comunale,{" "}
            {euro(tari.tefa, true)} di TEFA e {euro(tari.arera, true)} di componenti nazionali ARERA. La TARI paga solo il servizio rifiuti, che nel {ANNO_FISCALE} costa al Comune circa 15,7 milioni di euro.
          </p>
        )}

        {generale > 0 ? (
          <details className="more" open>
            <summary>Segui i tuoi {euro(generale)} al bilancio del Comune</summary>
            <div>
              <p className="note">
                {imu > 0 ? "Addizionale e IMU entrano" : "L'addizionale entra"} nel bilancio comunale insieme agli altri tributi e non {imu > 0 ? "hanno" : "ha"} una
                destinazione vincolata. Se seguissero la spesa del Comune per le funzioni fondamentali ({annoScontrino}), si dividerebbero così:
              </p>
              <BarList
                label="I tuoi soldi al Comune, divisi come la spesa comunale"
                items={quoteComune.map((q) => ({ id: q.id, label: q.voce, value: generale * q.quota, display: euro(generale * q.quota), alt: true }))}
              />
            </div>
          </details>
        ) : (
          <p className="callout">
            Con questo reddito non paghi l&apos;addizionale comunale: sei sotto la soglia di esenzione di 10.000 € oppure non devi
            IRPEF dopo le detrazioni.
          </p>
        )}

        <p className="note">
          Stima indicativa con le regole {ANNO_FISCALE}: scaglioni IRPEF, detrazioni per tipo di reddito, aliquote di Regione Campania e Comune, tariffe TARI
          e aliquote IMU deliberate. Non considera familiari a carico, spese detraibili, oneri deducibili, riduzioni TARI (ISEE, compostaggio, disabilità) né
          altri immobili.
          {tipo === "dipendente" && reddito > 0 && reddito <= 20000 &&
            " Per i dipendenti fino a 20.000 € è previsto anche un bonus in busta paga (dal 4,8% al 7,1% del reddito da lavoro) che qui non è sottratto."}{" "}
          <a href="/fonti#calcolatore">Regole e fonti</a>.
        </p>
      </div>
    </div>
  );
}

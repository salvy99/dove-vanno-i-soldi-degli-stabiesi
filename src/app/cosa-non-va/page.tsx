import type { Metadata } from "next";
import Link from "next/link";
import { coseCheVanno, segnali } from "@/lib/dati";
import { SOGLIE } from "@/lib/segnali";

export const metadata: Metadata = {
  title: "Cosa non va",
  description:
    "Lo specchietto dei punti critici nei dati ufficiali su Castellammare di Stabia: cosa misura ogni punto, con cosa lo confrontiamo e cosa chiedere.",
};

export default function CosaNonVaPage() {
  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Specchietto</p>
        <h1>Cosa non va (o va capito meglio)</h1>
        <p className="lead">
          Nei dati ufficiali abbiamo trovato {segnali.length} punti critici. Per ognuno trovi il numero, il confronto e la
          domanda da fare a chi amministra.
        </p>
        <p className="callout warn">
          Ogni punto ti dice dove guardare. Per accertare sprechi, errori o illeciti servono gli atti: chiedi a chi amministra
          di spiegare i numeri.
        </p>
      </section>

      <div className="table-wrap specchietto-wrap">
        <table className="specchietto">
          <thead>
            <tr>
              <th>Cosa</th>
              <th>Il dato</th>
              <th>Confronto</th>
              <th>Da chiedere</th>
              <th>Fonte</th>
            </tr>
          </thead>
          <tbody>
            {segnali.map((s) => (
              <tr key={s.id} id={s.id}>
                <td data-label="Cosa">
                  <div className="spec-cosa">
                    <span className="tag">{s.area}</span>
                    <strong className="spec-title">{s.titolo}</strong>
                    <span className="note">{s.spiegazione}</span>
                  </div>
                </td>
                <td data-label="Il dato" className="spec-dato">
                  {s.dato}
                </td>
                <td data-label="Confronto">{s.confronto}</td>
                <td data-label="Da chiedere" className="spec-domanda">
                  {s.domanda}
                </td>
                <td data-label="Fonte">
                  {s.fonte}
                  <br />
                  <Link href={s.link}>Approfondisci →</Link>
                  <br />
                  <Link href={`/cosa-non-va/${s.id}`}>Condividi →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {coseCheVanno.length > 0 && (
        <section className="section" aria-labelledby="cosa-va-bene">
          <div className="section-head">
            <h2 id="cosa-va-bene">E cosa va bene</h2>
            <p>Con le stesse regole abbiamo cercato anche dove il Comune fa meglio dei vicini o migliora.</p>
          </div>
          <div className="grid-2">
            {coseCheVanno.map((x) => (
              <article key={x.id} className="panel good">
                <span className="tag">{x.area}</span>
                <h3>{x.titolo}</h3>
                <p className="spec-dato">{x.dato}</p>
                <p className="note">{x.confronto}</p>
                <p className="note">{x.spiegazione}</p>
                <p className="note">
                  Fonte: {x.fonte} · <Link href={x.link}>Approfondisci →</Link>
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>Come scegliamo i punti</h2>
        <p style={{ maxWidth: "70ch" }}>
          Il sito ricava i punti dai dati con regole fisse, le stesse a ogni aggiornamento. Un punto compare solo se
          supera una soglia:
        </p>
        <ul style={{ maxWidth: "70ch", paddingLeft: 20, margin: 0 }}>
          <li>spesa per una funzione almeno il {SOGLIE.sopraStandard}% sopra lo standard, o almeno il {Math.abs(SOGLIE.sottoStandard)}% sotto;</li>
          <li>livello dei servizi OpenCivitas pari o inferiore a {SOGLIE.serviziBassi} su 10;</li>
          <li>tributi incassati in calo di almeno il {Math.abs(SOGLIE.caloTributi)}% tra gli ultimi due anni completi;</li>
          <li>pagamenti dell&apos;anno superiori agli incassi, al netto delle partite di giro;</li>
          <li>progetti PNRR ancora in corso dopo la data di fine prevista, alla data della fonte;</li>
          <li>progetti dei fondi di coesione localizzati solo in città ancora in corso dopo la fine prevista;</li>
          <li>fatture pagate in media dopo la scadenza (per le cose che vanno bene: pagate prima, e debito scaduto calato di almeno il {Math.abs(SOGLIE.caloDebito)}%);</li>
          <li>personale stabile calato di almeno il {Math.abs(SOGLIE.caloPersonale)}% dal primo anno disponibile;</li>
          <li>edifici del Comune dichiarati non utilizzati o inutilizzabili;</li>
          <li>reddito medio almeno il {Math.abs(SOGLIE.redditoSottoItalia)}% sotto la media italiana (come contesto).</li>
        </ul>
        <p className="note">A ogni aggiornamento il sito toglie i punti che non superano più la soglia.</p>
      </section>
    </div>
  );
}

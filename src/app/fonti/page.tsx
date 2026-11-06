import type { Metadata } from "next";
import { TUTTI_I_DATASET } from "@/lib/dati";
import { ANNO_FISCALE, FONTI_FISCALI } from "@/lib/regole-fiscali-2026";

export const metadata: Metadata = {
  title: "Fonti e metodo",
  description: "Da dove vengono i dati del sito, con quale licenza, fino a quando sono aggiornati e quali limiti hanno.",
};

export default function FontiPage() {
  const commit = TUTTI_I_DATASET.find((d) => d.estratto.commit)?.estratto.commit ?? "";
  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Fonti e metodo</p>
        <h1>Da dove vengono questi numeri</h1>
        <p className="lead">
          Ogni dato viene da una fonte pubblica ufficiale. Qui trovi chi lo pubblica, il periodo, la licenza e i limiti da tenere a
          mente prima di trarre conclusioni.
        </p>
      </section>

      <section className="section">
        <h2>Le regole del sito</h2>
        <ul className="lead" style={{ fontSize: 15, paddingLeft: 20, margin: 0 }}>
          <li>Nessun numero senza fonte e data.</li>
          <li>Nessun dato inventato o dimostrativo: se un dato manca, lo diciamo.</li>
          <li>Pagamenti, importi assegnati, stime e imposte dichiarate restano separati e non si sommano tra loro.</li>
          <li>Un valore insolito indica dove guardare meglio: non è un&apos;accusa né la prova di uno spreco.</li>
          <li>I confronti usano solo misure compatibili, per abitante.</li>
        </ul>
      </section>

      <section className="section">
        <h2>Le fonti dei dati</h2>
        <div className="grid-2">
          {TUTTI_I_DATASET.map((d) => (
            <article key={d.id} className="panel" id={d.id}>
              <h3>{d.titolo}</h3>
              <p>
                <a href={d.fonte.url}>{d.fonte.ente}</a>
              </p>
              <p className="note">
                Periodo: {d.fonte.periodo} · Licenza: {d.fonte.licenza}
                {d.fonte.pubblicato && <> · Pubblicato il {d.fonte.pubblicato}</>}
              </p>
              {d.avvertenze.length > 0 && (
                <ul className="note" style={{ margin: 0, paddingLeft: 18 }}>
                  {d.avvertenze.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="calcolatore">
        <h2>Le regole del calcolatore ({ANNO_FISCALE})</h2>
        <p className="note" style={{ maxWidth: "70ch" }}>
          Il calcolatore applica al reddito imponibile gli scaglioni IRPEF, le detrazioni per tipo di reddito, l&apos;ulteriore
          detrazione per i lavoratori dipendenti e le aliquote delle addizionali. Le addizionali sono dovute solo se, dopo le
          detrazioni, resta IRPEF da pagare. Per la casa applica le tariffe TARI 2026 (quota per metro quadro e per numero di persone, più TEFA e componenti ARERA) e le aliquote IMU 2026 alla rendita catastale. Non considera familiari a carico, spese detraibili, oneri deducibili né le riduzioni TARI: è una
          stima per capire l&apos;ordine di grandezza, non un calcolo fiscale.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Regola</th>
                <th>Riferimento</th>
              </tr>
            </thead>
            <tbody>
              {FONTI_FISCALI.map((f) => (
                <tr key={f.voce}>
                  <td>{f.voce}</td>
                  <td>
                    <a href={f.url}>{f.riferimento}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2>Come sono stati raccolti</h2>
        <p style={{ maxWidth: "70ch" }}>
          I dati sono estratti dagli snapshot verificati del progetto open source{" "}
          <a href="https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi">DoveVannoINostriSoldi</a> (versione{" "}
          <code>{commit.slice(0, 12)}</code>), che scarica le fonti ufficiali e ne conserva provenienza e impronte di controllo. Da lì
          prendiamo solo le righe di Castellammare di Stabia e dei Comuni di confronto. Tre fonti le scarichiamo direttamente:
          i tempi di pagamento e i debiti verso i fornitori dalla Ragioneria Generale dello Stato, i progetti dei fondi di
          coesione da OpenCoesione, e aliquote e tariffe del calcolatore dal portale del Dipartimento delle Finanze. Ogni lunedì
          un controllo automatico riscarica tutto, rifà i test e aggiorna il sito solo se i dati sono cambiati e coerenti.
        </p>
        <p className="note">
          Hai trovato un errore o vuoi proporre una fonte? Il codice è aperto (licenza AGPL v3): ogni correzione è benvenuta.
        </p>
      </section>
    </div>
  );
}

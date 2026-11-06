import Link from "next/link";
import { Calcolatore } from "@/components/calcolatore";
import { Fonte } from "@/components/fonte";
import { Scontrino } from "@/components/scontrino";
import {
  appalti,
  irpef,
  opencoesione,
  pagamenti as tempiPagamento,
  isComune,
  opencivitas,
  patrimonio,
  personale,
  pnrr,
  redditoMedio,
  scontrino,
  segnali,
  siopeAnno,
  totaleProprio,
  ultimoAnnoSiope,
} from "@/lib/dati";
import { euroCompatto, euro, numero, percentualeConSegno } from "@/lib/format";

export default function Home() {
  const s = scontrino(2022);
  const medio = redditoMedio(irpef.castellammare);
  const redditoIniziale = Math.round(medio / 500) * 500;
  const pagamenti = siopeAnno("pagamenti", ultimoAnnoSiope).castellammare;
  const incassi = siopeAnno("incassi", ultimoAnnoSiope).castellammare;
  const pnrrAttribuito = pnrr.progetti.reduce((a, p) => a + (p.finanziamentoAttribuitoCentesimi ?? 0), 0) / 100;
  const pnrrComune = pnrr.progetti.filter((p) => isComune(p.soggettoAttuatore)).length;
  const dip = personale.dipendenti;
  const primo = dip[0];
  const ultimo = dip.at(-1)!;
  const fermiComune = patrimonio.fabbricatiFermi
    .filter((f) => /CASTELLAMMARE/.test(f.ente) && f.utilizzo !== "In ristrutturazione/manutenzione")
    .reduce((a, f) => a + (f.fabbricati ?? 0), 0);
  const medioItalia = redditoMedio(irpef.italia);
  const coesioneSolo = opencoesione.progetti.filter((p) => p.comuni === 1);
  const coesioneQui = coesioneSolo.reduce((a, p) => a + (p.finanziamentoCentesimi ?? 0), 0) / 100;
  const coesionePagati = coesioneSolo.reduce((a, p) => a + (p.pagamentiCentesimi ?? 0), 0) / 100;
  const coesioneN = coesioneSolo.length;
  const tempiCm = tempiPagamento.comuni.find((c) => c.ipa === "c_c129")!.tempi.filter((t) => t.completo).at(-1)!;
  const ritardoUltimo = tempiCm.ritardoGiorni;
  const periodoUltimo = tempiCm.periodo;
  const sopra = s.voci.filter((v) => v.scartoPercentuale > 0);
  const sotto = s.voci.filter((v) => v.scartoPercentuale < 0);

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Castellammare di Stabia · dati pubblici ufficiali</p>
        <h1>Dove vanno i soldi che versi?</h1>
        <p className="lead">
          Una parte delle tue tasse resta in città, una parte va a Regione e Stato, e altri soldi pubblici arrivano a
          Castellammare da fuori. Qui li trovi tutti, in parole semplici, ognuno con la sua fonte.
        </p>
      </section>

      {/* 1 · TU */}
      <section className="section" aria-labelledby="tu">
        <div className="section-head">
          <span className="step">
            <b>1</b> Tu
          </span>
          <h2 id="tu">Quanto versi, e a chi?</h2>
          <p>Scrivi il tuo reddito: vedrai, in stima, quanto ne va allo Stato, alla Regione Campania e al Comune.</p>
        </div>
        <div className="panel">
          <Calcolatore redditoIniziale={redditoIniziale} quoteComune={s.voci.map(({ id, voce, quota }) => ({ id, voce, quota }))} annoScontrino={s.anno} />
        </div>
      </section>

      {/* 2 · IL COMUNE */}
      <section className="section" aria-labelledby="comune">
        <div className="section-head">
          <span className="step">
            <b>2</b> Il Comune
          </span>
          <h2 id="comune">Per ogni stabiese il Comune ha speso {euro(s.totale)}</h2>
          <p>
            È la spesa {s.anno} per le funzioni fondamentali, divisa per abitante. Accanto a ogni voce trovi quanto servirebbe
            secondo il <strong>fabbisogno standard</strong>, cioè la stima dello Stato per un Comune con le stesse caratteristiche.
          </p>
        </div>
        <div className="grid-2">
          <Scontrino {...s} />
          <div className="panel">
            <p className="panel-title">Come leggerlo</p>
            <p>
              Il Comune spende <strong>più dello standard</strong> per{" "}
              {sopra.map((v, i) => (
                <span key={v.id}>
                  {i > 0 && (i === sopra.length - 1 ? " e " : ", ")}
                  {v.voce.toLowerCase()} ({percentualeConSegno(v.scartoPercentuale)})
                </span>
              ))}
              ; <strong>meno</strong> per{" "}
              {sotto.map((v, i) => (
                <span key={v.id}>
                  {i > 0 && (i === sotto.length - 1 ? " e " : ", ")}
                  {v.voce.toLowerCase()} ({percentualeConSegno(v.scartoPercentuale)})
                </span>
              ))}
              .
            </p>
            <p className="callout">
              Spendere di più non dimostra uno spreco, spendere di meno non dimostra un risparmio: può voler dire anche meno
              servizi. Il voto dei servizi (da 0 a 10) confronta ciò che il Comune offre con i Comuni della stessa dimensione.
            </p>
            <Link href="/comune">Entrate, uscite e andamento negli anni →</Link>
            <Fonte dataset={opencivitas} avvertenze={false} />
          </div>
        </div>
      </section>

      {/* Specchietto: cosa non va */}
      <section className="section" aria-labelledby="cosa-non-va">
        <div className="alert-band">
          <h2 id="cosa-non-va">
            Cosa non va (o va capito meglio)
            <span className="count">{segnali.length} punti</span>
          </h2>
          <p className="note">
            I punti critici che emergono dai dati, ognuno con il suo confronto. Indicano dove guardare meglio: non sono accuse.
          </p>
          <ul className="alert-list">
            {segnali.map((x) => (
              <li key={x.id}>
                <Link href={`/cosa-non-va#${x.id}`}>
                  <strong>{x.titolo}</strong>
                  <span>
                    {x.dato} · {x.confronto}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/cosa-non-va">Apri lo specchietto completo, con le domande da fare al Comune →</Link>
        </div>
      </section>

      {/* 3 · TUTTO IL RESTO */}
      <section className="section" aria-labelledby="resto">
        <div className="section-head">
          <span className="step">
            <b>3</b> Tutto il resto
          </span>
          <h2 id="resto">Gli altri soldi pubblici che girano intorno a Castellammare</h2>
        </div>
        <nav className="tiles" aria-label="Approfondimenti">
          <Link className="tile" href="/comune">
            <span className="q">Quanto entra e quanto esce dalle casse del Comune?</span>
            <span className="a num">{euroCompatto(totaleProprio(pagamenti, "pagamenti"))}</span>
            <span className="s">
              pagati nel {ultimoAnnoSiope}, a fronte di {euroCompatto(totaleProprio(incassi, "incassi"))} incassati (al netto delle partite di giro)
            </span>
            <span className="go">Il bilancio di cassa →</span>
          </Link>
          <Link className="tile" href="/pnrr">
            <span className="q">Quanti soldi del PNRR arrivano in città?</span>
            <span className="a num">{euroCompatto(pnrrAttribuito)}</span>
            <span className="s">
              {numero(pnrr.progetti.length)} progetti, di cui {pnrrComune} gestiti dal Comune
            </span>
            <span className="go">Tutti i progetti →</span>
          </Link>
          <Link className="tile" href="/fondi-europei">
            <span className="q">E i fondi europei?</span>
            <span className="a num">{euroCompatto(coesioneQui)}</span>
            <span className="s">
              assegnati a {numero(coesioneN)} progetti solo in città, di cui {euroCompatto(coesionePagati)} già pagati
            </span>
            <span className="go">Fondi europei e di coesione →</span>
          </Link>
          <Link className="tile" href="/appalti">
            <span className="q">A chi affida lavori e servizi il Comune?</span>
            <span className="a num">{euroCompatto(Number(appalti.riepilogo.awardValue))}</span>
            <span className="s">
              in {numero(appalti.riepilogo.awardCount)} aggiudicazioni a {numero(appalti.riepilogo.awardeeCount)} operatori
            </span>
            <span className="go">Appalti e fornitori →</span>
          </Link>
          <Link className="tile" href="/comune#pagamenti">
            <span className="q">Il Comune paga in tempo i fornitori?</span>
            <span className="a num">{ritardoUltimo !== null && ritardoUltimo < 0 ? `${numero(Math.round(-ritardoUltimo))} giorni prima` : `${numero(Math.round(ritardoUltimo ?? 0))} giorni dopo`}</span>
            <span className="s">della scadenza, in media, per le fatture del {periodoUltimo}</span>
            <span className="go">Tempi di pagamento →</span>
          </Link>
          <Link className="tile" href="/personale">
            <span className="q">Quante persone lavorano per il Comune?</span>
            <span className="a num">{numero(ultimo.tempoIndeterminato)}</span>
            <span className="s">
              dipendenti stabili nel {ultimo.anno}; erano {numero(primo.tempoIndeterminato)} nel {primo.anno}
            </span>
            <span className="go">Personale e costi →</span>
          </Link>
          <Link className="tile" href="/redditi">
            <span className="q">Quanto guadagnano gli stabiesi?</span>
            <span className="a num">{euro(medio)}</span>
            <span className="s">
              reddito medio dichiarato ({irpef.annoImposta}); in Italia {euro(medioItalia)}
            </span>
            <span className="go">Redditi e IRPEF →</span>
          </Link>
          <Link className="tile" href="/patrimonio">
            <span className="q">Quali immobili pubblici restano vuoti?</span>
            <span className="a num">{numero(fermiComune)}</span>
            <span className="s">fabbricati del Comune dichiarati non utilizzati o inutilizzabili (2023)</span>
            <span className="go">Il patrimonio →</span>
          </Link>
        </nav>
      </section>
    </div>
  );
}

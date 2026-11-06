import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Fonte } from "@/components/fonte";
import { opencoesione, type ProgettoCoesione } from "@/lib/dati";
import { data, euro, euroMln, leggibile, numero, percentuale } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fondi europei e di coesione",
  description:
    "I progetti finanziati a Castellammare di Stabia con fondi europei (FESR, FSE) e nazionali per la coesione (FSC, POC, PAC): soldi assegnati, soldi spesi e progetti fermi.",
};

const fin = (p: ProgettoCoesione) => (p.finanziamentoCentesimi ?? 0) / 100;
const pag = (p: ProgettoCoesione) => (p.pagamentiCentesimi ?? 0) / 100;

function raggruppa(lista: ProgettoCoesione[], chiave: (p: ProgettoCoesione) => string) {
  const m = new Map<string, { nome: string; n: number; fin: number; pag: number }>();
  for (const p of lista) {
    const k = chiave(p);
    const g = m.get(k) ?? { nome: k, n: 0, fin: 0, pag: 0 };
    g.n += 1;
    g.fin += fin(p);
    g.pag += pag(p);
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.fin - a.fin);
}

export default function FondiEuropeiPage() {
  const tutti = opencoesione.progetti;
  // I totali della città usano solo i progetti localizzati unicamente qui:
  // OpenCoesione non divide gli importi dei progetti su più Comuni.
  const qui = tutti.filter((p) => p.comuni === 1);
  const altrove = tutti.filter((p) => p.comuni > 1);
  const totFin = qui.reduce((a, p) => a + fin(p), 0);
  const totPag = qui.reduce((a, p) => a + pag(p), 0);
  const comune = qui.filter((p) => p.delComune);
  const ritardo = qui.filter((p) => p.stato === "In corso" && p.finePrevista && p.finePrevista < opencoesione.dataDati);
  const perStato = raggruppa(qui, (p) => p.stato ?? "Non indicato");
  const perTema = raggruppa(qui, (p) => p.tema ?? "Non indicato").slice(0, 10);
  const perCiclo = raggruppa(qui, (p) => p.ciclo || "Non indicato").sort((a, b) => a.nome.localeCompare(b.nome));
  const principali = [...qui].sort((a, b) => fin(b) - fin(a)).slice(0, 40);

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Soldi che arrivano da fuori</p>
        <h1>Fondi europei e di coesione</h1>
        <p className="lead">
          {numero(qui.length)} progetti finanziati con le politiche di coesione (fondi europei e nazionali) riguardano solo
          Castellammare: <strong>{euroMln(totFin)}</strong> assegnati, di cui <strong>{euroMln(totPag)}</strong> già pagati (
          {percentuale((totPag / totFin) * 100)}). Altri {numero(altrove.length)} progetti coinvolgono anche altri Comuni.
        </p>
      </section>

      <div className="grid-3">
        <div className="panel figure">
          <span className="label">Assegnati a progetti solo in città</span>
          <span className="value">{euroMln(totFin)}</span>
          <span className="exact">{euro(totFin)}</span>
        </div>
        <div className="panel figure">
          <span className="label">Già pagati</span>
          <span className="value">{euroMln(totPag)}</span>
          <span className="exact">{percentuale((totPag / totFin) * 100)} dell&apos;assegnato</span>
        </div>
        <div className="panel figure">
          <span className="label">Progetti del Comune</span>
          <span className="value">{numero(comune.length)}</span>
          <span className="exact">
            {euroMln(comune.reduce((a, p) => a + fin(p), 0))} assegnati, {euroMln(comune.reduce((a, p) => a + pag(p), 0))} pagati
          </span>
        </div>
      </div>

      <section className="section grid-2">
        <div className="panel">
          <h2>Assegnato e pagato, per stato</h2>
          <BarList
            label="Finanziamento per stato del progetto"
            items={perStato.map((g) => ({ id: g.nome, label: `${g.nome} · ${numero(g.n)} progetti`, value: g.fin, display: euroMln(g.fin), sub: `pagati ${euroMln(g.pag)}` }))}
          />
          {ritardo.length > 0 && (
            <p className="callout warn">
              Per OpenCoesione {numero(ritardo.length)} progetti sono ancora in corso dopo la fine prevista ({euroMln(ritardo.reduce((a, p) => a + fin(p), 0))}).
              Alcuni dovevano finire anni fa: o i lavori sono fermi, o chi li gestisce non ha aggiornato i dati.
            </p>
          )}
        </div>
        <div className="panel">
          <h2>Per ciclo di programmazione</h2>
          <BarList
            label="Finanziamento per ciclo"
            items={perCiclo.map((g) => ({ id: g.nome, label: g.nome, value: g.fin, display: euroMln(g.fin), sub: `${numero(g.n)} progetti · pagati ${euroMln(g.pag)}` }))}
          />
          <p className="note">Ogni ciclo dura sette anni, ma gli enti possono pagare i progetti anche dopo.</p>
        </div>
      </section>

      <section className="section">
        <div className="panel">
          <h2>Per tema</h2>
          <BarList
            label="Finanziamento per tema"
            items={perTema.map((g) => ({ id: g.nome, label: g.nome, value: g.fin, display: euroMln(g.fin), sub: `${numero(g.n)} progetti · pagati ${euroMln(g.pag)}` }))}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>I {principali.length} progetti più grandi</h2>
          <p>
            Le righe in giallo, con l&apos;etichetta <span className="tag up">Comune</span>, sono i progetti che il Comune di
            Castellammare gestisce direttamente: ne risponde l&apos;amministrazione comunale. Gli altri li gestiscono Regione, ASL,
            EAV, imprese private e altri enti.
          </p>
          <p>
            Trovi tutti i {numero(tutti.length)} progetti, con le schede di dettaglio, su{" "}
            <a href="https://opencoesione.gov.it/it/territori/castellammare-di-stabia-comune/">OpenCoesione</a>.
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Progetto</th>
                <th>Chi lo gestisce</th>
                <th className="n">Assegnato</th>
                <th className="n">Pagato</th>
                <th>Stato</th>
                <th>Fine prevista</th>
              </tr>
            </thead>
            <tbody>
              {principali.map((p) => (
                <tr key={p.codice} className={p.delComune ? "me" : undefined}>
                  <td style={{ minWidth: 260 }}>
                    {p.link ? <a href={p.link}>{p.titolo}</a> : p.titolo}
                    <div className="note">
                      {p.delComune && <span className="tag up">Comune</span>}
                      {p.tema} · {p.fondo} {p.ciclo}
                    </div>
                  </td>
                  <td style={{ minWidth: 160 }}>{p.soggetto ? leggibile(p.soggetto) : "Non indicato"}</td>
                  <td className="n">{euro(fin(p))}</td>
                  <td className="n">{euro(pag(p))}</td>
                  <td>{p.stato}</td>
                  <td>{data(p.fineEffettiva ?? p.finePrevista)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Fonte dataset={opencoesione} />
      </section>
    </div>
  );
}

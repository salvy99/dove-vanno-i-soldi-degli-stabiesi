import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Fonte } from "@/components/fonte";
import { FASCE_REDDITO, FONTI_REDDITO, irpef, redditoMedio } from "@/lib/dati";
import { euro, euroCompatto, numero, percentuale } from "@/lib/format";

export const metadata: Metadata = {
  title: "Redditi degli stabiesi",
  description: "Quanto dichiarano e quanta IRPEF pagano i contribuenti di Castellammare di Stabia, confrontati con Campania e Italia.",
};

export default function RedditiPage() {
  const c = irpef.castellammare;
  const m = c.misure;
  const medio = redditoMedio(c);
  const campania = redditoMedio(irpef.campania);
  const italia = redditoMedio(irpef.italia);
  const totaleFasce = FASCE_REDDITO.reduce((a, [k]) => a + m[k].frequenza, 0);
  const sotto15 = (m.comprehensiveIncome0To10000.frequenza + m.comprehensiveIncome10000To15000.frequenza + m.nonPositiveComprehensiveIncome.frequenza) / totaleFasce;

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">I cittadini</p>
        <h1>Quanto dichiarano gli stabiesi</h1>
        <p className="lead">
          Nel {irpef.annoImposta} a Castellammare {numero(c.contribuenti)} contribuenti hanno dichiarato in media{" "}
          <strong>{euro(medio)}</strong> di reddito, contro {euro(campania)} in Campania e {euro(italia)} in Italia. Più di{" "}
          {percentuale(Math.floor(sotto15 * 100))} dichiara meno di 15.000 € l&apos;anno.
        </p>
      </section>

      <div className="grid-3">
        <div className="panel figure">
          <span className="label">IRPEF netta dichiarata (allo Stato)</span>
          <span className="value">{euroCompatto(m.netTaxDeclared.centesimi / 100)}</span>
          <span className="exact">da {numero(m.netTaxDeclared.frequenza)} contribuenti</span>
        </div>
        <div className="panel figure">
          <span className="label">Addizionale regionale dovuta</span>
          <span className="value">{euroCompatto(m.regionalSurtaxDue.centesimi / 100)}</span>
          <span className="exact">alla Regione Campania</span>
        </div>
        <div className="panel figure">
          <span className="label">Addizionale comunale dovuta</span>
          <span className="value">{euroCompatto(m.municipalSurtaxDue.centesimi / 100)}</span>
          <span className="exact">al Comune di Castellammare</span>
        </div>
      </div>

      <section className="section grid-2">
        <div className="panel">
          <h2>Reddito medio a confronto</h2>
          <BarList
            label="Reddito medio dichiarato"
            items={[
              { id: "cmare", label: "Castellammare di Stabia", value: medio, display: euro(medio), alt: true },
              { id: "campania", label: "Campania", value: campania, display: euro(campania) },
              { id: "italia", label: "Italia", value: italia, display: euro(italia) },
            ]}
          />
          <p className="note">Reddito complessivo medio di chi lo dichiara, in euro all&apos;anno, prima delle imposte.</p>
        </div>
        <div className="panel">
          <h2>Quanti contribuenti per fascia</h2>
          <BarList
            label="Contribuenti per fascia di reddito"
            items={FASCE_REDDITO.map(([k, label]) => ({ id: k, label, value: m[k].frequenza, display: `${numero(m[k].frequenza)} · ${percentuale((m[k].frequenza / totaleFasce) * 100, 1)}` }))}
          />
        </div>
      </section>

      <section className="section">
        <div className="panel">
          <h2>Da dove viene il reddito</h2>
          <BarList
            label="Reddito dichiarato per tipo"
            items={FONTI_REDDITO.map(([k, label]) => ({
              id: k,
              label,
              value: Math.max(0, m[k].centesimi / 100),
              display: euroCompatto(m[k].centesimi / 100),
              sub: `${numero(m[k].frequenza)} dichiarazioni`,
            }))}
          />
        </div>
        <Fonte dataset={irpef} />
      </section>
    </div>
  );
}

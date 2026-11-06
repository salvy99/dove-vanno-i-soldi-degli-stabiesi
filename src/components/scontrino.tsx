import { euro, numero, percentualeConSegno } from "@/lib/format";
import type { VoceScontrino } from "@/lib/dati";

/** La spesa del Comune per abitante, voce per voce, come uno scontrino. */
export function Scontrino({ anno, totale, voci }: { anno: number; totale: number; voci: VoceScontrino[] }) {
  return (
    <div className="receipt" role="group" aria-label={`Spesa del Comune per abitante nel ${anno}`}>
      <div className="receipt-head">
        <strong>COMUNE DI CASTELLAMMARE DI STABIA</strong>
        <span>Spesa per ogni abitante · anno {anno}</span>
      </div>
      {voci.map((v) => (
        <div className="receipt-row" key={v.id}>
          <span className="what">
            {v.voce}
            <small>
              servirebbero {euro(v.standardPerAbitante)}
              <span className={`tag${v.scartoPercentuale > 0 ? " up" : ""}`} title="Differenza rispetto alla spesa standard">
                {percentualeConSegno(v.scartoPercentuale)}
              </span>
              {v.livelloServizi !== null && <> · servizi {numero(v.livelloServizi)}/10</>}
            </small>
          </span>
          <span className="amount">{euro(v.perAbitante)}</span>
        </div>
      ))}
      <div className="receipt-total">
        <span>TOTALE</span>
        <span className="num">{euro(totale)}</span>
      </div>
    </div>
  );
}

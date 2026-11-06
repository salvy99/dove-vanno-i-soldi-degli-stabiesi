# Dove vanno i soldi · Castellammare di Stabia

Sito civico che spiega ai cittadini stabiesi, con dati pubblici ufficiali, **dove vanno i soldi che versano** e quali altri soldi pubblici girano intorno alla città.

È la versione cittadina di [DoveVannoINostriSoldi](https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi): ne riprende le regole (ogni numero con fonte, periodo e limiti; un dato insolito non è un'accusa) e ne usa gli snapshot verificati delle fonti ufficiali.

## Cosa c'è

| Pagina | Contenuto | Fonte |
| --- | --- | --- |
| `/` | 1) Calcolatore: quanto versi a Stato, Regione e Comune · 2) Lo "scontrino" della spesa comunale per abitante · riquadro "Cosa non va" · 3) Porte su tutto il resto | MEF Finanze, OpenCivitas |
| `/cosa-non-va` | Specchietto dei punti critici (e di quelli positivi) ricavati dai dati con regole e soglie fisse (`src/lib/segnali.ts`), con la domanda da fare al Comune; ogni punto ha una pagina e un'immagine da condividere | Tutte le fonti |
| `/comune` | Incassi e pagamenti di cassa per titolo, 2024-2026; spesa vs fabbisogno standard 2015-2022; tempi di pagamento dei fornitori e debito scaduto | SIOPE, OpenCivitas, MEF-RGS (PCC) |
| `/fondi-europei` | 1.366 progetti dei fondi di coesione (FESR, FSE, FSC, POC, PAC): assegnato, pagato, stato, temi | OpenCoesione |
| `/pnrr` | 217 progetti PNRR localizzati in città, per missione e soggetto | Italia Domani (ReGiS) |
| `/appalti` | Aggiudicazioni del Comune e operatori | ANAC |
| `/personale` | Dipendenti del Comune 2010-2024 e costo del lavoro 2020 | RGS Conto annuale |
| `/redditi` | Redditi e IRPEF dichiarati dagli stabiesi | MEF Dipartimento Finanze |
| `/patrimonio` | Immobili pubblici in città, compresi quelli non utilizzati | MEF censimento immobili 2023 |
| `/confronto` | Castellammare e 12 Comuni vicini, per abitante | SIOPE, OpenCivitas, MEF |
| `/fonti` | Fonti, licenze, limiti e regole del calcolatore | — |

## Avvio in locale

Serve Node.js 22.19 o successivo.

```bash
npm ci
npm run dev      # http://localhost:3000
npm test         # calcolatore + coerenza dei dati
npm run build
```

## Aggiornare i dati

Ogni lunedì il workflow GitHub `Aggiorna dati` fa tutto da solo: riscarica le fonti, rifà l'estrazione, esegue test e build e, solo se i dati sono cambiati e i controlli passano, salva le modifiche. Vercel ripubblica il sito a ogni nuovo commit. Si può lanciare anche a mano dalla scheda *Actions* di GitHub.

In locale (servono anche Python 3 e `pip install -r requirements.txt`):

```bash
npm run dati:aggiorna   # scarica e rigenera tutti i dati
npm test
```

| Comando | Cosa fa | Fonte |
| --- | --- | --- |
| `npm run dati:scarica` | Scarica solo i file necessari del repository originale (circa 235 MB invece di 4 GB) in `.cache/upstream` | DoveVannoINostriSoldi |
| `npm run dati:estrai` | Estrae le righe di Castellammare e dei 12 Comuni di confronto; scopre da solo i nuovi anni | SIOPE, OpenCivitas, MEF, Italia Domani, ANAC, RGS, MIM |
| `npm run dati:pagamenti` | Tempi di pagamento e debito commerciale | MEF-RGS, Piattaforma crediti commerciali |
| `npm run dati:coesione` | Progetti dei fondi di coesione localizzati in città | OpenCoesione (file open data della Campania) |

Ogni file registra fonte ufficiale, licenza e provenienza (commit del repository originale oppure impronta SHA-256 del file scaricato). I file vengono riscritti solo se i dati cambiano davvero.

Le aliquote e tariffe del calcolatore (IRPEF, addizionali, TARI, TEFA, IMU) sono in `src/lib/regole-fiscali-2026.ts`, con il link alla delibera di ognuna. Vanno aggiornate ogni anno a mano, quando escono le nuove delibere.

## Licenza

Codice sotto [GNU AGPL v3](LICENSE), come il progetto originale: chi pubblica una versione modificata deve renderne disponibile il codice. I dati restano soggetti alle licenze delle rispettive fonti (CC BY, IODL), indicate nella pagina `/fonti`.

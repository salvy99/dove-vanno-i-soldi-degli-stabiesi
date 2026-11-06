#!/usr/bin/env python3
"""Tempi di pagamento e debito commerciale di Castellammare e dei Comuni di
confronto, dai file della Ragioneria Generale dello Stato (Piattaforma dei
Crediti Commerciali). Scrive src/data/castellammare/pagamenti.json.

Uso:  python3 -I scripts/estrai-pagamenti.py
Serve openpyxl (requirements.txt). I file scaricati restano in .cache/rgs/.

La pagina RGS elenca file XLSX con nomi non del tutto regolari: lo script
legge la pagina e sceglie i link in base al nome, così prende da solo i
nuovi anni quando vengono pubblicati.
"""
import hashlib
import json
import re
import ssl
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "rgs"
OUT = ROOT / "src" / "data" / "castellammare" / "pagamenti.json"
SITO = "https://www.rgs.mef.gov.it"
PAGINA = f"{SITO}/VERSIONE-I/tempi_di_pagamento_e_debiti_commerciali_delle_pubbliche_amministrazioni/monitoraggio/dati_per_singola_amministrazione/"
PAGINE = [PAGINA, PAGINA + "archivio/"]
METODO = f"{SITO}/VERSIONE-I/tempi_di_pagamento_e_debiti_commerciali_delle_pubbliche_amministrazioni/cosa_sapere/indicatori_dei_tempi_di_pagamento/"
UA = {"User-Agent": "Mozilla/5.0 (compatible; dove-vanno-i-soldi-castellammare)"}

# Codice IPA → nome. Il codice è l'unico identificativo affidabile nei file
# (attenzione: C_C130 è Castellammare del Golfo).
COMUNI = {
    "C_C129": "Castellammare di Stabia",
    "C_L259": "Torre del Greco",
    "C_L245": "Torre Annunziata",
    "C_H243": "Ercolano",
    "C_G902": "Portici",
    "C_G964": "Pozzuoli",
    "C_B990": "Casoria",
    "C_A064": "Afragola",
    "C_A024": "Acerra",
    "C_E131": "Gragnano",
    "C_G813": "Pompei",
    "C_I862": "Sorrento",
    "C_L845": "Vico Equense",
}

# Il debito al 31/12/2023 è pubblicato dalla RGS solo in PDF: valori trascritti
# da quel file (importi comunicati dagli enti). Portici e Sorrento non compaiono.
DEBITO_2023_PDF = {
    "url": f"{SITO}/_Documenti/VERSIONE-I/tempi_di_pagamento_e_debiti_commerciali_delle_pubbliche_amministrazioni/monitoraggio_dei_tempi_di_pagamento_delle_pubbliche_amministrazioni/il_monitoraggio_dello_stock_di_debiti_commerciali_residui/2025/Debito/Debito-scaduto-al-31-dicembre-2023.pdf",
    "valori": {
        "C_C129": 8441837.53, "C_L259": 7960560.46, "C_L245": 12006198.94, "C_H243": 1361022.32,
        "C_G964": 808193.77, "C_B990": 8627810.67, "C_A064": 25932337.04, "C_A024": 3337291.92,
        "C_E131": 27304.60, "C_G813": 318862.93, "C_L845": 670760.41,
    },
}


def _contesto_ssl():
    # Il Python di python.org su macOS non usa i certificati di sistema: se c'è certifi lo usiamo.
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


SSL = _contesto_ssl()


def scarica(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120, context=SSL) as r:
        return r.read()


def link_xlsx() -> list[str]:
    links = set()
    for pagina in PAGINE:
        html = scarica(pagina).decode("utf-8", "replace")
        for href in re.findall(r'href="([^"]+\.xlsx)"', html, flags=re.I):
            links.add(href if href.startswith("http") else SITO + href)
    return sorted(links)


def scegli(links: list[str]):
    """Anni interi dal 2023 + l'ultimo semestre se l'anno non è ancora chiuso."""
    tempi, debito = {}, {}
    for u in links:
        nome = u.rsplit("/", 1)[-1]
        if m := re.match(r"Fatture-del-(\d{4})-Pagamenti.*\.xlsx$", nome, re.I):
            tempi[(int(m[1]), 12)] = u
        elif m := re.match(r"Fatture-primo-semestre-del-(\d{4})-.*\.xlsx$", nome, re.I):
            tempi[(int(m[1]), 6)] = u
        elif m := re.match(r"Debito-scaduto-al-31-dicembre-(\d{4})\.xlsx$", nome, re.I):
            debito[(int(m[1]), 12)] = u
        elif m := re.match(r"Debito-scaduto-al-30-giugno-(\d{4})\.xlsx$", nome, re.I):
            debito[(int(m[1]), 6)] = u

    def filtra(d):
        anni_chiusi = {a for (a, mese) in d if mese == 12}
        return {k: v for k, v in sorted(d.items()) if k[0] >= 2023 and (k[1] == 12 or k[0] not in anni_chiusi)}

    return filtra(tempi), filtra(debito)


def leggi(url: str):
    CACHE.mkdir(parents=True, exist_ok=True)
    dati = scarica(url)
    (CACHE / url.rsplit("/", 1)[-1]).write_bytes(dati)
    wb = openpyxl.load_workbook(CACHE / url.rsplit("/", 1)[-1], read_only=True, data_only=True)
    return list(wb.worksheets[0].iter_rows(values_only=True)), hashlib.sha256(dati).hexdigest()


def numero(v):
    if v is None or v == "-" or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def estrai_tempi(rows):
    # Intestazione su due righe dal 2024 (dati dalla riga 4), su una nel 2023 (dati dalla riga 3).
    hrow, start = (rows[2], 3) if rows[2][0] is None else (rows[1], 2)
    nomi = [" ".join(str(h).split()).lower() if h is not None else "" for h in hrow]

    def col(prefisso):
        return next((i for i, n in enumerate(nomi) if n.startswith(prefisso)), None)

    c = {
        "fatture": col("no. fatture"),
        "dovuto": col("importo commerciale dovuto"),
        "pagato": col("importo commerciale pagato"),
        "pagamento": col("tempo medio ponderato di pagamento"),
        "ritardo": col("tempo medio ponderato di ritardo"),
    }
    if c["ritardo"] is None or c["pagamento"] is None:
        raise SystemExit(f"Colonne dei tempi non trovate: {nomi}")
    out = {}
    for r in rows[start:]:
        if not r or r[0] is None:
            continue
        m = re.search(r"\(([^()]*)\)\s*$", str(r[0]))
        if m and m[1].upper() in COMUNI:
            g = lambda k: numero(r[c[k]]) if c[k] is not None and c[k] < len(r) else None  # noqa: E731
            out[m[1].upper()] = {
                "ritardoGiorni": None if g("ritardo") is None else round(g("ritardo"), 1),
                "pagamentoGiorni": None if g("pagamento") is None else round(g("pagamento"), 1),
                "fatture": None if g("fatture") is None else int(g("fatture")),
                "dovutoCentesimi": None if g("dovuto") is None else round(g("dovuto") * 100),
                "pagatoCentesimi": None if g("pagato") is None else round(g("pagato") * 100),
            }
    return out


def estrai_debito(rows):
    out = {}
    for r in rows[1:]:
        if not r or len(r) < 3 or r[1] is None:
            continue
        codice = str(r[1]).strip().upper()
        if codice in COMUNI:
            nota = str(r[3] or "") if len(r) > 3 else ""
            out[codice] = {
                "centesimi": None if numero(r[2]) is None else round(numero(r[2]) * 100),
                "tipo": "calcolato dalla piattaforma" if "calcolato" in nota.lower() else "comunicato dal Comune",
            }
    return out


def periodo(anno: int, mese: int, tipo: str) -> str:
    if tipo == "tempi":
        return str(anno) if mese == 12 else f"1° semestre {anno}"
    return f"31/12/{anno}" if mese == 12 else f"30/06/{anno}"


def main():
    tempi_url, debito_url = scegli(link_xlsx())
    if not any(m == 12 for (_, m) in tempi_url):
        raise SystemExit("Nessun file annuale dei tempi di pagamento trovato sulla pagina RGS")
    file_usati = []
    comuni = {codice: {"ipa": codice.lower(), "nome": nome, "tempi": [], "debito": []} for codice, nome in COMUNI.items()}

    for (anno, mese), url in tempi_url.items():
        rows, sha = leggi(url)
        file_usati.append({"url": url, "sha256": sha})
        dati = estrai_tempi(rows)
        if "C_C129" not in dati:
            raise SystemExit(f"Castellammare assente in {url}")
        for codice, v in dati.items():
            comuni[codice]["tempi"].append({"periodo": periodo(anno, mese, "tempi"), "anno": anno, "completo": mese == 12, **v})

    for codice, valore in DEBITO_2023_PDF["valori"].items():
        comuni[codice]["debito"].append({"periodo": "31/12/2023", "anno": 2023, "completo": True, "centesimi": round(valore * 100), "tipo": "comunicato dal Comune"})
    file_usati.append({"url": DEBITO_2023_PDF["url"], "nota": "valori trascritti dal PDF"})
    for (anno, mese), url in debito_url.items():
        if anno == 2023 and mese == 12:
            continue
        rows, sha = leggi(url)
        file_usati.append({"url": url, "sha256": sha})
        for codice, v in estrai_debito(rows).items():
            comuni[codice]["debito"].append({"periodo": periodo(anno, mese, "debito"), "anno": anno, "completo": mese == 12, **v})

    payload = {
        "id": "pagamenti",
        "titolo": "Tempi di pagamento dei fornitori e debiti commerciali",
        "fonte": {
            "ente": "MEF · Ragioneria Generale dello Stato (Piattaforma dei Crediti Commerciali)",
            "url": PAGINA,
            "licenza": "Nessuna licenza aperta dichiarata: uso non commerciale con citazione della fonte",
            "periodo": f"Fatture dal 2023 al {periodo(*max(tempi_url), 'tempi')}; debito dal 31/12/2023 al {periodo(*max(debito_url), 'debito')}",
        },
        "avvertenze": [
            "Il ritardo medio è il Tempo medio ponderato di ritardo (TMR) calcolato dalla Ragioneria per tutti gli enti: un numero negativo vuol dire che in media il Comune paga prima della scadenza.",
            "Non coincide con l'indicatore di tempestività che il Comune pubblica in Amministrazione trasparente: il TMR guarda le fatture ricevute nell'anno, l'indicatore comunale quelle pagate nell'anno (compresi gli arretrati).",
            "I tempi sono ponderati sugli importi delle fatture, al netto dell'IVA e dei periodi di sospensione.",
            "Il debito scaduto è spesso comunicato dal Comune stesso; se non lo comunica, lo calcola la piattaforma. I valori possono essere rivisti nei file successivi.",
        ],
        "metodologia": METODO,
        "estratto": {"repository": PAGINA, "scaricato": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "file": file_usati},
        "comuni": [comuni[c] for c in COMUNI],
    }

    # Non riscrivere se cambia solo la data di scaricamento.
    if OUT.exists():
        prima = json.loads(OUT.read_text())
        confronta = lambda d: json.dumps({**d, "estratto": {**d["estratto"], "scaricato": None}}, sort_keys=True)  # noqa: E731
        if confronta(prima) == confronta(payload):
            print("= pagamenti.json (invariato)")
            return
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(f"✓ pagamenti.json (aggiornato): {len(tempi_url)} periodi di tempi, {len(debito_url)} di debito")


if __name__ == "__main__":
    sys.exit(main())

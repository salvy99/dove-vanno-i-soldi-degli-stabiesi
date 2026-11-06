#!/usr/bin/env python3
"""Progetti delle politiche di coesione (fondi europei FESR/FSE e nazionali
FSC/POC/PAC) localizzati a Castellammare di Stabia, dal file open data della
Campania pubblicato da OpenCoesione. Scrive src/data/castellammare/opencoesione.json.

Uso:  python3 -I scripts/estrai-opencoesione.py
Il file regionale (circa 23 MB compressi, 290 MB di CSV) resta in .cache/opencoesione/.
"""
import csv
import hashlib
import io
import json
import re
import ssl
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "opencoesione"
OUT = ROOT / "src" / "data" / "castellammare" / "opencoesione.json"
URL = "https://opencoesione.gov.it/it/opendata/regioni/progetti_esteso_CAM.zip"
COMUNE = "015063024"  # regione + provincia + comune ISTAT
CF_COMUNE = "82000270635"
UA = {"User-Agent": "Mozilla/5.0 (compatible; dove-vanno-i-soldi-castellammare)"}


def _contesto_ssl():
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def euro_in_centesimi(v: str):
    v = (v or "").strip()
    if not v:
        return None
    return round(float(v.replace(".", "").replace(",", ".")) * 100)


def data_iso(v: str):
    v = (v or "").strip()
    return f"{v[:4]}-{v[4:6]}-{v[6:8]}" if re.fullmatch(r"\d{8}", v) else None


def lista(v: str):
    return [x.strip() for x in (v or "").split(":::") if x.strip()]


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(URL, headers=UA)
    with urllib.request.urlopen(req, timeout=300, context=_contesto_ssl()) as r:
        url_finale = r.geturl()
        dati = r.read()
    nome_zip = url_finale.rsplit("/", 1)[-1]
    (CACHE / nome_zip).write_bytes(dati)
    m = re.search(r"_(\d{8})\.zip$", nome_zip)
    data_dati = data_iso(m[1]) if m else None

    csv.field_size_limit(10**9)
    progetti, esclusi = [], 0
    with zipfile.ZipFile(io.BytesIO(dati)) as z:
        membro = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        with z.open(membro) as f:
            lettore = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8", newline=""), delimiter=";")
            for riga in lettore:
                comuni = lista(riga.get("COD_COMUNE"))
                if COMUNE not in comuni:
                    continue
                if riga.get("OC_FLAG_VISUALIZZAZIONE", "0").strip() != "0":
                    esclusi += 1  # duplicati o progetti confluiti in altri, non pubblicati dal portale
                    continue
                soggetti = lista(riga.get("OC_DENOM_BENEFICIARIO")) or lista(riga.get("OC_DENOM_ATTUATORE"))
                cf = lista(riga.get("OC_CODFISC_BENEFICIARIO")) + lista(riga.get("OC_CODFISC_ATTUATORE"))
                progetti.append({
                    "codice": riga["COD_LOCALE_PROGETTO"],
                    "cup": riga.get("CUP") or None,
                    "titolo": " ".join((riga.get("OC_TITOLO_PROGETTO") or "").split()),
                    "ciclo": (riga.get("OC_DESCR_CICLO") or "").replace("Ciclo di programmazione ", ""),
                    "tema": riga.get("OC_TEMA_SINTETICO") or None,
                    "natura": riga.get("CUP_DESCR_NATURA") or None,
                    "fondo": riga.get("OC_AMBITO") or None,
                    "programma": " · ".join(lista(riga.get("OC_DESCRIZIONE_PROGRAMMA"))) or None,
                    "soggetto": " · ".join(soggetti) or None,
                    "delComune": CF_COMUNE in cf,
                    "finanziamentoCentesimi": euro_in_centesimi(riga.get("OC_FINANZ_TOT_PUB_NETTO")),
                    "coesioneCentesimi": euro_in_centesimi(riga.get("OC_COSTO_COESIONE")),
                    "pagamentiCentesimi": euro_in_centesimi(riga.get("TOT_PAGAMENTI")),
                    "stato": riga.get("OC_STATO_PROGETTO") or None,
                    "inizio": data_iso(riga.get("OC_DATA_INIZIO_PROGETTO")),
                    "finePrevista": data_iso(riga.get("OC_DATA_FINE_PROGETTO_PREVISTA")),
                    "fineEffettiva": data_iso(riga.get("OC_DATA_FINE_PROGETTO_EFFETTIVA")),
                    "comuni": len(comuni),
                    "link": riga.get("OC_LINK") or None,
                })

    if len(progetti) < 100:
        raise SystemExit(f"Solo {len(progetti)} progetti per Castellammare: il file è cambiato?")
    progetti.sort(key=lambda p: -(p["finanziamentoCentesimi"] or 0))

    payload = {
        "id": "opencoesione",
        "titolo": "Progetti delle politiche di coesione (fondi europei e nazionali)",
        "fonte": {
            "ente": "OpenCoesione · Presidenza del Consiglio e MEF-RGS-IGRUE (Sistema nazionale di monitoraggio)",
            "url": "https://opencoesione.gov.it/it/territori/castellammare-di-stabia-comune/",
            "licenza": "CC BY 4.0",
            "periodo": f"Cicli 2000-2006, 2007-2013, 2014-2020 e 2021-2027 · dati al {data_dati or 'n.d.'}",
        },
        "avvertenze": [
            "Il finanziamento è quello pubblico assegnato al progetto al netto delle economie, non quanto è già stato speso: per questo indichiamo anche i pagamenti.",
            "OpenCoesione non divide gli importi dei progetti che riguardano più Comuni: per questi l'importo è quello dell'intero progetto. Li teniamo separati dai totali della città.",
            "Il finanziamento comprende anche risorse pubbliche diverse dai fondi della coesione (per esempio statali o regionali) che lo stesso progetto usa.",
            "Non comprende il PNRR, che è nella sua pagina; un solo CUP compare in entrambi gli elenchi.",
            "Alcuni progetti dei cicli chiusi hanno dati fermi agli anni passati: lo stato è quello comunicato da chi gestisce il progetto.",
        ],
        "dataDati": data_dati,
        "estratto": {
            "repository": URL,
            "scaricato": None,
            "file": [{"url": url_finale, "sha256": hashlib.sha256(dati).hexdigest()}],
        },
        "esclusiDalPortale": esclusi,
        "progetti": progetti,
    }
    if OUT.exists() and json.loads(OUT.read_text()) == payload:
        print("= opencoesione.json (invariato)")
        return
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n")
    print(f"✓ opencoesione.json (aggiornato): {len(progetti)} progetti, dati al {data_dati}")


if __name__ == "__main__":
    sys.exit(main())

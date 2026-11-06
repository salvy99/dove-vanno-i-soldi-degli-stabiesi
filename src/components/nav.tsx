"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

const VOCI = [
  ["/", "Inizio"],
  ["/comune", "Il Comune"],
  ["/cosa-non-va", "Cosa non va"],
  ["/pnrr", "PNRR"],
  ["/fondi-europei", "Fondi UE"],
  ["/appalti", "Appalti"],
  ["/redditi", "Redditi"],
  ["/confronto", "Confronto"],
  ["/fonti", "Fonti"],
] as const;

/** Menu: in linea sul computer, a tendina sul telefono (pulsante "Menu" con aria-expanded). */
export function Nav() {
  const path = usePathname();
  const id = useId();
  const [aperto, setAperto] = useState(false);

  // Si chiude da solo quando si cambia pagina o si preme Esc.
  const [pathPrecedente, setPathPrecedente] = useState(path);
  if (path !== pathPrecedente) {
    setPathPrecedente(path);
    setAperto(false);
  }
  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAperto(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aperto]);

  const attivo = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  return (
    <>
      <button type="button" className="menu-button" aria-expanded={aperto} aria-controls={id} onClick={() => setAperto((v) => !v)}>
        <span className="menu-icon" aria-hidden="true">
          <i />
        </span>
        <span className="menu-label">Menu</span>
      </button>
      <nav id={id} className={`nav${aperto ? " open" : ""}`} aria-label="Sezioni">
        {VOCI.map(([href, label]) => (
          <Link key={href} href={href} aria-current={attivo(href) ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Sezioni">
      {VOCI.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

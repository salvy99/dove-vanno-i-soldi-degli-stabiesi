import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Pagina non trovata</p>
        <h1>
          Questa pagina <em>non c&apos;è</em>
        </h1>
        <p className="lead">Forse il link è sbagliato o la pagina è stata spostata. I dati sono tutti qui:</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/">
            Torna all&apos;inizio
          </Link>
          <Link className="btn btn-ghost" href="/cosa-non-va">
            Cosa non va
          </Link>
        </div>
      </section>
    </div>
  );
}

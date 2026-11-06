/** Segno del sito: un sole giallo sul golfo blu. Non è lo stemma del Comune. */
export function Marchio({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#ffd100" />
      <circle cx="16" cy="13" r="6" fill="#0b2a5e" />
      <path d="M4 22 Q 8 18 12 22 T 20 22 T 28 22" fill="none" stroke="#0b2a5e" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M4 27 Q 8 23 12 27 T 20 27 T 28 27" fill="none" stroke="#0b2a5e" strokeWidth="2.6" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

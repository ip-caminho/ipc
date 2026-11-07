// Conectores redesenhados a partir da foto traseira; usados com <use href="#...">
export function SimbolosConectores() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <radialGradient id="niq" cx="50%" cy="50%" r="52%">
          <stop offset="72%" stopColor="#5f6266" />
          <stop offset="86%" stopColor="#dad9d2" />
          <stop offset="100%" stopColor="#7f7f78" />
        </radialGradient>
        <linearGradient id="tab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ddd7c6" />
          <stop offset="1" stopColor="#9d9786" />
        </linearGradient>
        <symbol id="xlr-m" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="27" fill="url(#niq)" />
          <circle cx="30" cy="30" r="20.5" fill="#0d0d0e" />
          <circle cx="19" cy="25" r="3.8" fill="#d6b35a" />
          <circle cx="41" cy="25" r="3.8" fill="#d6b35a" />
          <circle cx="30" cy="40" r="3.8" fill="#d6b35a" />
        </symbol>
        <symbol id="xlr-f" viewBox="0 0 60 60">
          <circle cx="30" cy="33" r="25" fill="#0a0a0b" stroke="#b9b8b0" strokeWidth="2" />
          <circle cx="30" cy="33" r="19" fill="#17181a" />
          <circle cx="20" cy="30" r="3.2" fill="#000" />
          <circle cx="40" cy="30" r="3.2" fill="#000" />
          <circle cx="30" cy="43" r="3.2" fill="#000" />
          <rect x="21" y="1" width="18" height="10" rx="2" fill="url(#tab)" />
        </symbol>
        <symbol id="combo" viewBox="0 0 60 60">
          <circle cx="30" cy="33" r="25" fill="#0a0a0b" stroke="#b9b8b0" strokeWidth="2" />
          <circle cx="30" cy="33" r="19" fill="#17181a" />
          <circle cx="30" cy="33" r="9" fill="#000" />
          <circle cx="16" cy="29" r="3" fill="#000" />
          <circle cx="44" cy="29" r="3" fill="#000" />
          <path d="M26.5 20h7l-1 6h-5z" fill="#000" />
          <rect x="21" y="1" width="18" height="10" rx="2" fill="url(#tab)" />
        </symbol>
        <symbol id="ethercon" viewBox="0 0 60 60">
          <circle cx="30" cy="33" r="25" fill="url(#niq)" />
          <circle cx="30" cy="33" r="19" fill="#141516" />
          <path d="M18 24h24v14h-5v5h-14v-5h-5z" fill="#050505" stroke="#6c6f73" />
          <rect x="21" y="1" width="18" height="10" rx="2" fill="url(#tab)" />
        </symbol>
        <symbol id="dc4" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="26" fill="url(#niq)" />
          <circle cx="30" cy="30" r="19" fill="#141516" />
          <circle cx="21" cy="24" r="3.3" fill="#d6b35a" />
          <circle cx="39" cy="24" r="3.3" fill="#d6b35a" />
          <circle cx="21" cy="38" r="3.3" fill="#d6b35a" />
          <circle cx="39" cy="38" r="3.3" fill="#d6b35a" />
        </symbol>
        <symbol id="usbb" viewBox="0 0 60 60">
          <path d="M14 16h32v30H14z" fill="#b7b9bc" />
          <path d="M20 22h20v12l-5 5H25l-5-5z" fill="#050505" />
          <rect x="26" y="26" width="8" height="7" fill="#d9d9d9" />
        </symbol>
        <symbol id="rj45" viewBox="0 0 60 60">
          <path d="M6 8h48v44H6z" fill="#b9bcc0" />
          <path d="M13 15h34v24h-8v7H21v-7h-8z" fill="#1a1b1d" />
          <path d="M17 20h26v3H17z" fill="#d2b76a" />
        </symbol>
        <symbol id="ic-rede" viewBox="0 0 40 18">
          <g fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M14 2h12v5H14zM2 12h10v5H2zM15 12h10v5H15zM28 12h10v5H28zM20 7v5M7 12v-2.5h26V12" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

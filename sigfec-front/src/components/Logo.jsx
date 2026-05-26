/* eslint-disable react/prop-types */

/**
 * SIGFEC logo — hexágono industrial com "S" estilizado + folha de mandioca.
 * Representa: indústria (hex), fecularia (S), agricultura (folha).
 */
export default function Logo({ size = 40, withText = false }) {
  return (
    <span className="inline-flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="SIGFEC"
      >
        <defs>
          <linearGradient id="sigfecGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="sigfecGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* hex outline industrial */}
        <path
          d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
          fill="url(#sigfecGrad)"
        />
        <path
          d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
          fill="url(#sigfecGlow)"
        />

        {/* internal hex outline */}
        <path
          d="M32 10 L51 21 L51 43 L32 54 L13 43 L13 21 Z"
          fill="none"
          stroke="#022c22"
          strokeOpacity="0.25"
          strokeWidth="1"
        />

        {/* S estilizado (curva de fluxo industrial) */}
        <path
          d="M40 22 C 40 18, 36 17, 32 17 C 27 17, 23 19, 23 24 C 23 28, 27 29, 32 30 C 37 31, 41 32, 41 37 C 41 43, 35 46, 30 46 C 25 46, 22 44, 22 41"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* gota de amido pequena (acento agrícola) */}
        <circle cx="46" cy="20" r="2.5" fill="#fef3c7" opacity="0.95" />
        <circle cx="46" cy="20" r="2.5" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6" />
      </svg>
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="text-xl font-black tracking-tight text-white">SIGFEC</span>
          <span className="text-[9px] uppercase tracking-[0.25em] text-slate-500 mt-1">ERP Fecularia</span>
        </span>
      )}
    </span>
  );
}

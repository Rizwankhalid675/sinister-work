export const Shield = ({ size = 22, stroke = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2 20 5.5V11c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5.5Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export const Plug = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <path d="M10 6.5h4M6.5 10v4M17.5 10v4M14 17.5h-4" />
  </svg>
)

export const Chart = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20V11M10 20V4M16 20v-7M22 20V7" />
  </svg>
)

export const Check = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

export const Arrow = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const Menu = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0a0f14" strokeWidth="1.8"
    strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const BigShield = ({ className }) => (
  <svg className={className} viewBox="0 0 100 116" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="bs" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#12b3ac" />
        <stop offset="1" stopColor="#0b7a75" />
      </linearGradient>
    </defs>
    <path d="M50 4 92 20v34c0 27-18 44-42 54C26 98 8 81 8 54V20Z"
      stroke="url(#bs)" strokeWidth="2.4" fill="rgba(15,158,152,.05)" />
    <path d="M50 27v56M31 45h38" stroke="url(#bs)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="50" cy="56" r="30" stroke="rgba(15,158,152,.25)" strokeWidth="1" />
  </svg>
)

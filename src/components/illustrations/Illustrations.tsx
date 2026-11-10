import type { SVGProps } from "react";

// Flat drawings of the real thing (a phone, a shelf, a list, a chat), so the
// steps read at a glance without knowing what an icon means. Colors are
// tokens, so they follow the theme.

type Props = SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 160 120", fill: "none", role: "img" } as const;

// A phone filming a shelf of goods.
export function FilmShelfDrawing(props: Props) {
  return (
    <svg {...base} aria-label="A phone filming a shop shelf" {...props}>
      <rect x="8" y="22" width="84" height="76" rx="6" fill="var(--surface-2)" />
      <rect x="8" y="50" width="84" height="5" fill="var(--fg-subtle)" opacity="0.5" />
      <rect x="8" y="80" width="84" height="5" fill="var(--fg-subtle)" opacity="0.5" />
      <rect x="16" y="32" width="14" height="18" rx="2" fill="var(--brand)" />
      <rect x="34" y="28" width="12" height="22" rx="2" fill="var(--sun)" />
      <rect x="50" y="34" width="16" height="16" rx="2" fill="var(--accent)" />
      <rect x="70" y="30" width="14" height="20" rx="2" fill="var(--berry)" />
      <rect x="16" y="62" width="18" height="18" rx="2" fill="var(--accent)" />
      <rect x="38" y="64" width="12" height="16" rx="2" fill="var(--brand)" />
      <rect x="54" y="60" width="14" height="20" rx="2" fill="var(--sun)" />
      <rect x="72" y="66" width="12" height="14" rx="2" fill="var(--berry)" />
      <rect x="96" y="14" width="56" height="94" rx="10" fill="var(--fg)" />
      <rect x="100" y="22" width="48" height="76" rx="4" fill="var(--bg-raised)" />
      <rect x="106" y="38" width="12" height="16" rx="2" fill="var(--sun)" />
      <rect x="122" y="42" width="14" height="12" rx="2" fill="var(--accent)" />
      <rect x="104" y="58" width="40" height="3" fill="var(--fg-subtle)" opacity="0.5" />
      <circle cx="124" cy="86" r="6" fill="var(--danger)" />
      <path d="M104 30h6M104 30v6M144 30h-6M144 30v6M104 74v-6M104 74h6M144 74h-6M144 74v-6" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// The product list, checked, with prices.
export function CheckListDrawing(props: Props) {
  const rows = [
    { y: 18, color: "var(--brand)", price: 28 },
    { y: 50, color: "var(--accent)", price: 22 },
    { y: 82, color: "var(--sun)", price: 26 },
  ];
  return (
    <svg {...base} aria-label="A list of products with prices, checked" {...props}>
      {rows.map(({ y, color, price }) => (
        <g key={y}>
          <rect x="12" y={y} width="136" height="24" rx="6" fill="var(--bg-raised)" />
          <rect x="18" y={y + 4} width="16" height="16" rx="3" fill={color} />
          <rect x="40" y={y + 6} width="52" height="5" rx="2.5" fill="var(--fg)" opacity="0.75" />
          <rect x="40" y={y + 14} width="32" height="4" rx="2" fill="var(--fg-subtle)" opacity="0.6" />
          <rect x={112 - price + 22} y={y + 8} width={price - 4} height="8" rx="4" fill="var(--brand-soft)" />
          <circle cx="136" cy={y + 12} r="7" fill="var(--success)" />
          <path d={`M132.5 ${y + 12}l2.5 2.5 4.5-5`} stroke="var(--bg-raised)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}

// The shop link in a chat, and an order coming back.
export function ShareLinkDrawing(props: Props) {
  return (
    <svg {...base} aria-label="A shop link shared in a chat, and an order reply" {...props}>
      <rect x="10" y="12" width="104" height="54" rx="12" fill="var(--bg-raised)" />
      <rect x="18" y="20" width="36" height="38" rx="6" fill="var(--surface-2)" />
      <rect x="22" y="26" width="12" height="12" rx="2" fill="var(--brand)" />
      <rect x="38" y="26" width="12" height="12" rx="2" fill="var(--accent)" />
      <rect x="22" y="42" width="28" height="4" rx="2" fill="var(--fg-subtle)" opacity="0.6" />
      <rect x="60" y="24" width="44" height="6" rx="3" fill="var(--fg)" opacity="0.75" />
      <rect x="60" y="36" width="32" height="5" rx="2.5" fill="var(--brand)" />
      <rect x="60" y="46" width="38" height="4" rx="2" fill="var(--fg-subtle)" opacity="0.6" />
      <rect x="46" y="74" width="104" height="36" rx="12" fill="var(--success)" />
      <rect x="58" y="84" width="60" height="5" rx="2.5" fill="var(--bg-raised)" opacity="0.9" />
      <rect x="58" y="94" width="40" height="5" rx="2.5" fill="var(--bg-raised)" opacity="0.7" />
      <circle cx="134" cy="92" r="7" fill="var(--bg-raised)" opacity="0.9" />
    </svg>
  );
}

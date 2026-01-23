import { palette } from "../../packages/ui-tokens/src/palette";

/**
 * Badge placeholder image helpers.
 */
const svg = (title: string, color: string) =>
  `data:image/svg+xml;utf8,` +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'>
      <defs>
        <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stop-color='${color}' stop-opacity='0.9'/>
          <stop offset='100%' stop-color='${palette.neutral[900]}' stop-opacity='1'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <circle cx='256' cy='180' r='80' fill='${palette.neutral[50]}' fill-opacity='0.12' />
      <text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle' fill='${palette.neutral[50]}' font-size='28' font-family='system-ui,Segoe UI,Roboto'>${title}</text>
      <text x='50%' y='68%' dominant-baseline='middle' text-anchor='middle' fill='${palette.neutral[50]}' fill-opacity='0.85' font-size='16' font-family='system-ui,Segoe UI,Roboto'>Achievo Badge</text>
    </svg>`,
  );

/** Generates a placeholder badge record for a given level. */
export function placeholderForLevel(level: number): { name: string; image: string; description: string } {
  switch (level) {
    case 1: // SELF
      return {
        name: "Achievo – Self Verified",
        image: svg("SELF VERIFIED", palette.brand[500]),
        description: "Self-attested achievement",
      };
    case 2: // PEER
      return {
        name: "Achievo – Peer Verified",
        image: svg("PEER VERIFIED", palette.success),
        description: "Peer-verified achievement",
      };
    case 3: // AUTO
      return {
        name: "Achievo – Auto Verified",
        image: svg("AUTO VERIFIED", palette.info),
        description: "Automatically verified achievement",
      };
    default:
      return {
        name: "Achievo – Unverified",
        image: svg("UNVERIFIED", palette.neutral[500]),
        description: "Unverified achievement",
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND CONFIGURATION: the single place to change the product's name, logo and
// wordmark. "Claryo" is a provisional working name pending domain, app-store,
// company-name and trademark checks.
//
// Every screen, the browser tab title, the installable-app manifest and the
// app icon read from here. You can also override the name at build time with
// the VITE_BRAND_NAME / VITE_BRAND_SHORT_NAME environment variables, without
// editing code.
//
// Keep this file free of imports: vite.config.ts reads it at build time.
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandConfig {
  /** Full product name shown in the UI. */
  name: string;
  /** Short name for the home-screen icon label (max ~12 characters). */
  shortName: string;
  /** One-line value proposition. */
  tagline: string;
  /** Used in the app manifest and page description. */
  description: string;
  /** Support contact shown in Settings › Help. Leave empty to hide. */
  supportEmail: string;
  /**
   * Logo mark. "builtin" draws the geometric "first step" mark below.
   * To use an image instead, set { kind: "image", src: "/your-logo.svg" } and
   * put the file in /public.
   */
  logo: { kind: "builtin" } | { kind: "image"; src: string };
  /** Primary brand colour (logo background, theme colour). */
  primaryColor: string;
  /** Accent colour used in the logo mark. */
  accentColor: string;
}

const env: Record<string, string | undefined> =
  typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env
    ? (import.meta as { env: Record<string, string> }).env
    : {};

export const brand: BrandConfig = {
  name: env.VITE_BRAND_NAME || "Claryo",
  shortName: env.VITE_BRAND_SHORT_NAME || env.VITE_BRAND_NAME || "Claryo",
  tagline: "Turn your ideas into clear next steps.",
  description: "Turn goals and overwhelming tasks into a clear plan and a first step you can start today.",
  supportEmail: "",
  logo: { kind: "builtin" },
  primaryColor: "#4F46E5",
  accentColor: "#22C55E",
};

/**
 * The built-in mark: three ascending steps inside a rounded square, with the
 * first step highlighted ("a clear first step"). Simple geometry so it reads at
 * 16px and works in one colour.
 */
export function logoMarkSvg(opts: { size?: number; mono?: string } = {}): string {
  const size = opts.size ?? 64;
  const bg = opts.mono ?? brand.primaryColor;
  const fg = opts.mono ? "#fff" : "#fff";
  const accent = opts.mono ? "#fff" : brand.accentColor;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${bg}"/><rect x="14" y="38" width="10" height="12" rx="3" fill="${accent}"/><rect x="27" y="28" width="10" height="22" rx="3" fill="${fg}" opacity="0.9"/><rect x="40" y="16" width="10" height="34" rx="3" fill="${fg}" opacity="0.65"/></svg>`;
}

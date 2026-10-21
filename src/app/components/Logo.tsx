import { brand, logoMarkSvg } from '../../brand.config';

/** Logo mark from brand.config.ts. Decorative: pair it with the wordmark or a label. */
export function LogoMark({ size = 32 }: { size?: number }) {
  if (brand.logo.kind === 'image') {
    return <img src={brand.logo.src} width={size} height={size} alt="" aria-hidden className="rounded-[25%]" />;
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, display: 'inline-block', lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: logoMarkSvg({ size }) }}
    />
  );
}

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="font-bold tracking-tight text-ink" style={{ fontSize: size, letterSpacing: '-0.02em' }}>
      {brand.name}
    </span>
  );
}

export function Lockup({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <Wordmark size={Math.round(size * 0.68)} />
    </span>
  );
}

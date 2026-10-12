import { configuredSocials } from '../lib/socials';
import { SocialIcon } from './SocialIcon';

// Row of social links. Renders only the platforms that have a URL set in src/lib/socials.ts.
export function SocialLinks({ size = 20, className = '' }: { size?: number; className?: string }) {
  const socials = configuredSocials();
  if (socials.length === 0) return null;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {socials.map((s) => (
        <a
          key={s.key}
          href={s.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={s.label}
          className="pressable flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
        >
          <SocialIcon name={s.key} size={size} />
        </a>
      ))}
    </div>
  );
}

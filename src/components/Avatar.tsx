// Shows a profile picture if present, otherwise the first letter of the email.
export function Avatar({ src, name, size = 36, className = '' }: { src?: string | null; name: string; size?: number; className?: string }) {
  const letter = name[0]?.toUpperCase() ?? '?';
  if (src) {
    return <img src={src} alt="" style={{ width: size, height: size }} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-white/10 font-extrabold ${className}`}
    >
      {letter}
    </span>
  );
}

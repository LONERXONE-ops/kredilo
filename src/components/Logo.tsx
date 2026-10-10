export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 48"
      className={className}
      fill="currentColor"
      aria-label="Kredilo"
    >
      {/* Abstract mark */}
      <path d="M8 32c0-8 6-14 14-14 2 0 4 .4 5.5 1.2C29 14 34 10 40 10c6 0 10 4 10 10 0 2-.6 4-1.6 5.5C52 27 54 30 54 34c0 6-5 11-11 11-4 0-7.5-2-9.5-5-1.2 1.2-2.8 2-4.5 2-4.5 0-8-3.5-8-8 0-1.2.3-2.3.8-3.3C19.5 32.5 17 36 12 36c-4 0-7-3-7-7 0-2.5 1.3-4.7 3.2-6C6.5 24.5 8 28 8 32z" />
      <circle cx="42" cy="12" r="4" />
      {/* Wordmark "kredilo" */}
      <text
        x="70"
        y="34"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="28"
        letterSpacing="-0.5"
      >
        kredilo
      </text>
    </svg>
  );
}

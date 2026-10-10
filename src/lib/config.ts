// Centralized configuration - provisional product settings
export const CONFIG = {
  TOKENS_PER_NAIRA: 10, // 10 tokens = ₦1
  MIN_WITHDRAWAL_NAIRA: 1000,
  MIN_WITHDRAWAL_TOKENS: 10000,
  DEMO_MODE: true, // Clearly indicate demo/mock data
} as const;

export const formatTokens = (tokens: number) => tokens.toLocaleString();
export const tokensToNaira = (tokens: number) => (tokens / CONFIG.TOKENS_PER_NAIRA).toFixed(2);
export const formatNaira = (amount: number) => `₦${amount.toLocaleString()}`;

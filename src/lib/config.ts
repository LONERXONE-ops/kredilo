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

// Approved provisional launch funding plan (planning figures, not proof of deposited money)
export const FUNDING_PLAN = {
  LAUNCH_CEILING_NAIRA: 3000,
  REWARD_RESERVE_NAIRA: 2400,
  FEES_CONTINGENCY_NAIRA: 600,
} as const;

import { PolicyLayout } from '../components/PolicyLayout';

export default function RewardPolicy() {
  return (
    <PolicyLayout
      badge="Rewards"
      title="Rewards & Withdrawals"
      intro="How tokens are earned, checked and, eventually, withdrawn. Read this to understand what is real and what is not yet."
      sections={[
        { h: 'How you earn tokens', p: ['You complete eligible tasks and games. Each one shows its token reward, time and requirements before you start. The reward amount is set by Kredilo, not by your device.'] },
        { h: 'How completions are checked', p: ['Built-in games are checked automatically against server rules. Other tasks may need you to submit proof, such as a screenshot, a link or text, and may be reviewed manually. Only the proof a task actually needs will be requested.'] },
        { h: 'Why a submission may be rejected', p: ['The proof is missing, unclear, edited or does not meet the requirements, the task was already completed, a daily limit was reached, or the activity looks like abuse. You will see the reason, and no tokens are credited for a rejected submission.'] },
        { h: 'Limits and funding', p: ['Tasks can have daily limits and cooldowns. Rewards are paid from limited funding. When funding runs out, new rewards stop until it is topped up. No income is guaranteed.'] },
        { h: 'Token value', p: ['The provisional rate is 10 tokens = ₦1. If the rate changes, tokens you already hold keep the value they were earned at.'] },
        { h: 'Withdrawals are not open yet', p: ['The planned minimum is 10,000 tokens (₦1,000). Withdrawals will open only after secure payments, funding checks and testing are complete. We will announce it clearly. Until then no real money is paid.'] },
        { h: 'Withdrawal statuses', p: ['Requested: tokens are set aside for you. Processing: the payment is being sent and checked. Paid: shown only after the payment is confirmed. Failed: the tokens are returned to your balance.'] },
        { h: 'Sponsors', p: ['There are no sponsors yet. Sponsored tasks will appear only when real sponsors and funding exist, and they will be clearly marked.'] },
      ]}
    />
  );
}

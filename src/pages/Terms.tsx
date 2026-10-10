import { PolicyLayout } from '../components/PolicyLayout';

export default function Terms() {
  return (
    <PolicyLayout
      badge="Legal"
      title="Terms of Service"
      intro="The rules for using Kredilo. Please read them before you create an account."
      sections={[
        { h: 'About Kredilo', p: ['Kredilo is a task-to-earn platform for users in Nigeria. You complete eligible tasks and games and may earn platform tokens. Kredilo is not an investment, gambling, cryptocurrency or trading service, and it does not guarantee any income.'] },
        { h: 'Demo stage', p: ['Kredilo is currently a demo. Balances, tasks and transactions you see are sample data. No real money is paid out and no sponsored tasks exist yet.'] },
        { h: 'Accounts', p: ['You must give accurate information and keep your login details private. You may hold only one account. You are responsible for activity on your account.'] },
        { h: 'Tasks and rewards', p: ['Each task states its requirements and token reward before you start. Rewards are credited only after a completion is verified. We may reject a submission that does not meet the stated requirements, and we will show the reason.'] },
        { h: 'Not allowed', p: ['Creating multiple or fake accounts, using bots or automation, submitting false or edited proof, exploiting bugs, or trying to change balances or rewards. We may reject rewards, suspend accounts and reverse credited tokens where abuse is found.'] },
        { h: 'Tokens', p: ['Tokens are platform credits. The provisional rate is 10 tokens = ₦1. A rate change will not silently change the value of tokens you already hold. Tokens have no guaranteed cash value.'] },
        { h: 'Withdrawals', p: ['Withdrawals are not available yet. When they open, the planned minimum is 10,000 tokens (₦1,000), and a withdrawal counts as paid only after the payment is confirmed. Rewards are limited by available funding.'] },
        { h: 'Changes and contact', p: ['We may update these terms as Kredilo develops, and will show the date of the latest version. For questions, use the Contact page.'] },
      ]}
    />
  );
}

import { PolicyLayout } from '../components/PolicyLayout';

export default function Terms() {
  return (
    <PolicyLayout
      badge="Legal"
      title="Terms of Service"
      intro="These terms govern your use of Kredilo. By creating an account or using the platform, you agree to them. Please read them carefully."
      sections={[
        { h: 'About Kredilo', p: ['Kredilo is a task-to-earn platform for users in Nigeria. You complete eligible tasks and games to earn kreds, the platform’s reward credit, which can be withdrawn as Naira once withdrawals are open. Kredilo is not a bank, an investment, a lottery, a gambling service, or a cryptocurrency, and it does not promise or guarantee any level of income.'] },
        { h: 'Eligibility', p: ['You must be at least 18 years old and able to form a binding contract to use Kredilo. By using the platform you confirm that the information you provide is accurate and that you are using Kredilo for yourself, not on behalf of anyone else.'] },
        { h: 'Your account', p: ['You may hold only one account. You must keep your password confidential and are responsible for all activity under your account. Tell us immediately if you believe your account has been accessed without your permission. We may suspend or close accounts that break these terms.'] },
        { h: 'Tasks and rewards', p: ['Each task shows its requirements and kred reward before you start. Rewards are credited only after your submission is reviewed and approved. We may reject a submission that does not meet the stated requirements, and the reason will be shown to you. Reward availability depends on platform funding.'] },
        { h: 'Posting tasks', p: ['You may pay to post your own task for other users to complete. Posted tasks are reviewed before they go live, must follow these terms, and must not involve anything illegal, misleading, or harmful. Posting fees are for the service of listing and are generally non-refundable once a task is live. A posted task automatically ends when the number of days you paid for expires.'] },
        { h: 'Referrals', p: ['You may invite others using your referral code. You earn a kred bonus when someone who signed up with your code completes their first task. Referral rewards for self-referrals, fake accounts, or other abuse will be withheld and may lead to account suspension.'] },
        { h: 'Acceptable use', p: ['You must not create multiple or fake accounts, use bots or automation, submit false or edited proof, exploit bugs, manipulate balances or rewards, or interfere with the platform or other users. We may reject rewards, reverse credited kreds, suspend or close accounts, and withhold payouts where we reasonably believe abuse has occurred.'] },
        { h: 'Kreds and value', p: ['Kreds are platform reward credits, not legal tender or a financial instrument. The current rate is 100 kreds = ₦50. We may change this rate for future earnings, but a change will not retroactively reduce the stated value of kreds already in your balance. Kreds are non-transferable between accounts.'] },
        { h: 'Withdrawals', p: ['Withdrawals are processed as manual bank transfers to the account details you provide, and open on a date set by Kredilo. The current minimum withdrawal is 2,000 kreds (₦1,000). A withdrawal is only complete once the transfer has been sent and marked paid. We may hold, review, or cancel a withdrawal where we suspect fraud or a breach of these terms, and will tell you the reason.'] },
        { h: 'Disclaimers and liability', p: ['Kredilo is provided “as is”. We work to keep the service accurate and available but do not guarantee it will be uninterrupted or error-free. To the fullest extent permitted by law, Kredilo is not liable for indirect or consequential losses, and our total liability to you is limited to the value of kreds in your account at the time of the event.'] },
        { h: 'Suspension and termination', p: ['You may close your account at any time. We may suspend or terminate your access if you breach these terms or if required by law. Unlawfully obtained rewards may be reversed.'] },
        { h: 'Changes and governing law', p: ['We may update these terms as Kredilo develops and will update the “last updated” date. Continued use after a change means you accept the updated terms. These terms are governed by the laws of the Federal Republic of Nigeria. For questions, use the Contact page.'] },
      ]}
    />
  );
}

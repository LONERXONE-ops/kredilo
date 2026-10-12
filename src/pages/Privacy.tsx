import { PolicyLayout } from '../components/PolicyLayout';

export default function Privacy() {
  return (
    <PolicyLayout
      badge="Legal"
      title="Privacy Policy"
      intro="This policy explains what personal data Kredilo collects, how we use it, and the choices you have. We aim to collect only what the service genuinely needs."
      sections={[
        { h: 'Who we are', p: ['Kredilo is a task-to-earn platform operating in Nigeria. This policy covers the Kredilo website and account. For any privacy question, contact us through the Contact page.'] },
        { h: 'Data we collect', p: ['Account details: your email address, chosen username and a securely hashed password. Activity: the tasks you start, submissions and any proof images you upload, your kred balance and transaction history, and referral activity. For withdrawals: the bank name, account name and account number you provide, which are encrypted. Technical: limited records such as timestamps and rate-limit data used to keep the platform secure.'] },
        { h: 'How we use your data', p: ['To create and run your account, verify task completions, credit and track kreds, process withdrawals, operate the referral programme, prevent fraud and abuse, keep required financial and security records, and contact you about your account.'] },
        { h: 'Legal basis', p: ['We process your data to provide the service you asked for (performing our contract with you), to meet legal and record-keeping obligations, and for our legitimate interest in keeping the platform safe and preventing abuse.'] },
        { h: 'Sharing your data', p: ['We do not sell your personal data. We share the minimum necessary with service providers who help us operate — for example our email provider for verification and notification messages, and any image hosting we use for proof uploads. We may disclose data where the law requires it or to protect the platform and its users.'] },
        { h: 'Security', p: ['Passwords are stored hashed, bank details are encrypted at rest, secrets are kept on the server, and admin and financial actions are logged. No system is perfectly secure, but we take reasonable measures to protect your data and will notify you if an incident materially affects you.'] },
        { h: 'Data retention', p: ['We keep your data for as long as your account is active and for a reasonable period afterward to meet legal, financial and anti-fraud obligations. When data is no longer needed, we delete or anonymise it.'] },
        { h: 'Your rights', p: ['You can ask us to access, correct or delete your personal data, subject to records we are required to keep for legal, financial or security reasons. To make a request, use the Contact page. You may also close your account at any time.'] },
        { h: 'Children', p: ['Kredilo is not intended for anyone under 18. We do not knowingly collect data from children. If you believe a minor has created an account, contact us and we will remove it.'] },
        { h: 'Changes to this policy', p: ['We may update this policy as Kredilo develops and will change the “last updated” date above. Significant changes will be made clear within the app.'] },
      ]}
    />
  );
}

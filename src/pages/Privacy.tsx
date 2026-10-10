import { PolicyLayout } from '../components/PolicyLayout';

export default function Privacy() {
  return (
    <PolicyLayout
      badge="Legal"
      title="Privacy Policy"
      intro="How Kredilo handles your personal data. We aim to collect only what the service needs."
      sections={[
        { h: 'Demo stage', p: ['In the current demo, forms are not connected to a server. Nothing you type is saved or sent anywhere.'] },
        { h: 'What we plan to collect', p: ['Your email address and a securely hashed password, your task activity and submissions, any proof you choose to upload for a task, and basic records needed to prevent abuse such as limits and timestamps.'] },
        { h: 'What we will not collect', p: ['We do not plan to collect unnecessary banking details, and we will not use invasive device fingerprinting or unrelated tracking. If withdrawals open, we will ask only for the payout details the payment provider requires.'] },
        { h: 'How we use it', p: ['To run your account, verify tasks, credit rewards, keep a record of transactions, prevent fraud, and contact you about your account.'] },
        { h: 'Sharing', p: ['We do not sell your personal data. We may share the minimum needed with service providers such as email or payment partners, or where the law requires it.'] },
        { h: 'Keeping data safe', p: ['Passwords are stored hashed, secrets are kept on the server, and financial and admin actions are logged. No system is perfectly secure, and we will tell you if something affects you.'] },
        { h: 'Your choices', p: ['You can ask us to access, correct or delete your data, subject to records we must keep for financial and security reasons. Use the Contact page to ask.'] },
      ]}
    />
  );
}

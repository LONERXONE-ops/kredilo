export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">About Kredilo</h1>
      <p className="text-white/70 leading-relaxed mb-4">
        Kredilo is a task-to-earn platform designed for users in Nigeria. Complete simple activities such as surveys, social engagement, content tasks, and browser games to earn tokens.
      </p>
      <p className="text-white/70 leading-relaxed mb-4">
        Tokens can be withdrawn once you meet the minimum requirements. All rewards are based on configured task rules and eligible completions. Verification may be required before rewards become available.
      </p>
      <p className="text-white/50 text-sm">
        This is the frontend application. Backend integration for authentication, task management, payments, and admin controls is planned separately.
      </p>
    </div>
  );
}

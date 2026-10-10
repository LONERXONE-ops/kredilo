import { mockTasks } from '../../lib/mockData';

const fields = ['Title', 'Category', 'Description', 'Requirements', 'Proof needed (none, screenshot, link, text)', 'Reward in tokens', 'Time estimate', 'Daily limit per user', 'Cooldown', 'Availability (on or off)', 'Funding source (demo; sponsored is unavailable)'];

export default function AdminTasks() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-extrabold">Tasks</h1>
          <p className="mt-1 max-w-xl text-white/55">Create and edit tasks, set rewards and turn them on or off.</p>
        </div>
        <button disabled className="min-h-11 cursor-not-allowed rounded-full bg-white/10 px-6 text-sm font-bold text-white/40">New task (needs backend)</button>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Current demo tasks</h2>
        <p className="mt-1 text-xs text-white/40">Read-only sample data.</p>
        <div className="mt-3 divide-y divide-white/5">
          {mockTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{t.title}</div>
                <div className="text-xs text-white/45">{t.category} · {t.timeMinutes} mins · {t.requiresProof ? 'proof required' : 'no proof'}</div>
              </div>
              <div className="shrink-0 text-right text-sm font-extrabold">{t.reward} tokens</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Task editor will include</h2>
        <ul className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
          {fields.map((f) => <li key={f} className="rounded-2xl bg-white/[0.04] px-4 py-2.5">{f}</li>)}
        </ul>
        <p className="mt-4 text-sm text-white/55">
          A task can only be switched on if its reward fits inside the available reserve. Reward amounts are stored on the server, never taken from the browser.
        </p>
      </section>
    </div>
  );
}

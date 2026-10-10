import { mockUser, mockTransactions } from '../../lib/mockData';
import { CONFIG, formatTokens, tokensToNaira, formatNaira } from '../../lib/config';
import { ArrowUpRight, History } from 'lucide-react';
import { useState } from 'react';

export default function Wallet() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const eligible = mockUser.tokens >= CONFIG.MIN_WITHDRAWAL_TOKENS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-sm text-white/60">Manage your tokens, track your balance and handle your earnings.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 border border-white/10 rounded-2xl bg-[#111]">
          <div className="text-sm text-white/50">Available Balance</div>
          <div className="text-3xl font-bold mt-1">{formatTokens(mockUser.tokens)}</div>
          <div className="text-xs text-white/40 mt-1">≈ {formatNaira(Number(tokensToNaira(mockUser.tokens)))} ({CONFIG.TOKENS_PER_NAIRA} tokens = ₦1)</div>
        </div>
        <div className="p-5 border border-white/10 rounded-2xl bg-[#111]">
          <div className="text-sm text-white/50">Pending Rewards</div>
          <div className="text-3xl font-bold mt-1">{formatTokens(mockUser.pending)}</div>
          <div className="text-xs text-white/40 mt-1">≈ {formatNaira(Number(tokensToNaira(mockUser.pending)))}</div>
        </div>
        <div className="p-5 border border-white/10 rounded-2xl bg-[#111]">
          <div className="text-sm text-white/50">Total Earned</div>
          <div className="text-3xl font-bold mt-1">{formatTokens(mockUser.totalEarned)}</div>
          <div className="text-xs text-white/40 mt-1">≈ {formatNaira(Number(tokensToNaira(mockUser.totalEarned)))}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h2 className="font-semibold mb-4">Token Balance</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold">K</div>
              <div>
                <div className="font-medium">Kredilo Token (KRD)</div>
                <div className="text-2xl font-bold">{formatTokens(mockUser.tokens)} KRD</div>
                <div className="text-xs text-white/40">≈ {formatNaira(Number(tokensToNaira(mockUser.tokens)))}</div>
              </div>
            </div>
            <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/40" style={{ width: `${Math.min(100, (mockUser.tokens / CONFIG.MIN_WITHDRAWAL_TOKENS) * 100)}%` }} />
            </div>
            <p className="text-xs text-white/40 mt-2">Your tokens can be used for withdrawals or exchanged for rewards (when available).</p>
          </div>

          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Transactions</h2>
              <button className="text-sm text-white/60">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/40 text-left">
                  <tr><th className="pb-2">Date & Time</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {mockTransactions.map(tx => (
                    <tr key={tx.id} className="border-t border-white/5">
                      <td className="py-3">{tx.date}</td>
                      <td>{tx.type}</td>
                      <td className="text-white/70">{tx.description}</td>
                      <td className={tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>{tx.amount > 0 ? '+' : ''}{tx.amount} KRD</td>
                      <td><span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{tx.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <button onClick={() => setShowWithdraw(true)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm mb-2">
              <span>Request Withdrawal</span> <ArrowUpRight size={16} />
            </button>
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm">
              <span>View Transaction History</span> <History size={16} />
            </button>
          </div>

          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h3 className="font-semibold mb-2">Withdrawals</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Current Eligibility</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${eligible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {eligible ? 'Eligible' : 'Not Eligible'}
              </span>
            </div>
            <div className="text-lg font-bold mb-2">{formatTokens(mockUser.totalEarned)} KRD</div>
            <p className="text-xs text-white/50 mb-3">You can request a withdrawal once you reach the minimum requirement of {formatTokens(CONFIG.MIN_WITHDRAWAL_TOKENS)} tokens ({formatNaira(CONFIG.MIN_WITHDRAWAL_NAIRA)}).</p>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (mockUser.tokens / CONFIG.MIN_WITHDRAWAL_TOKENS) * 100)}%` }} />
            </div>
            <div className="text-xs text-white/40">{formatTokens(mockUser.tokens)} / {formatTokens(CONFIG.MIN_WITHDRAWAL_TOKENS)} KRD</div>
          </div>

          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h3 className="font-semibold mb-3">Supported Payout Methods</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">🏦 Bank Transfer</div>
              <div className="flex items-center gap-2">₮ USDT (TRC20)</div>
              <div className="flex items-center gap-2">💳 PayPal</div>
            </div>
            <p className="text-xs text-white/40 mt-3">Payout methods may vary by region and are subject to availability. Demo mode — no real payouts processed.</p>
          </div>
        </div>
      </div>

      {showWithdraw && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-lg mb-4">Request Withdrawal</h3>
            <p className="text-sm text-white/60 mb-4">Minimum: {formatTokens(CONFIG.MIN_WITHDRAWAL_TOKENS)} tokens ({formatNaira(CONFIG.MIN_WITHDRAWAL_NAIRA)}). This is a demo — no real payment will be processed.</p>
            <input type="number" placeholder="Amount in tokens" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowWithdraw(false)} className="flex-1 border border-white/20 py-2 rounded-full text-sm">Cancel</button>
              <button onClick={() => { alert('Demo: Withdrawal request submitted (not processed).'); setShowWithdraw(false); }} className="flex-1 bg-white text-black py-2 rounded-full text-sm font-semibold">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

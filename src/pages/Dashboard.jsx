import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <button
              onClick={() => router.push('/')}
              className="text-lg font-semibold text-white hover:text-indigo-400 transition-colors"
            >
              Trading Copilot
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Demo User</span>
              <button
                onClick={() => router.push('/')}
                className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400 mb-8">
          Your AI-native trading workspace. Core features will live here.
        </p>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-500">
            Dashboard content (trade intent, risk structure, execution) — 70% of product.
          </p>
        </div>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { useRouter } from 'next/router';

export default function AuthModal({ isOpen, onClose }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    // Minimal auth: just accept and go to dashboard
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      router.push('/dashboard');
    }, 400);
  };

  const handleDemoUser = () => {
    onClose();
    router.push('/dashboard');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700/80">
          <h2 className="text-xl font-semibold text-white">Sign in</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Signing in…' : 'Continue with Email'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-900 px-3 text-slate-500">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoUser}
            className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 font-medium text-slate-200 hover:bg-slate-800 hover:border-slate-500 transition-colors"
          >
            Continue as Demo User
          </button>
          <p className="text-xs text-slate-500 text-center">
            Demo mode — no account required. Ideal for trying the product.
          </p>
        </div>
      </div>
    </div>
  );
}

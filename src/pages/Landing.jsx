import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import Navbar from '../components/Navbar';
import MaxWidthWrapper from '../components/global/MaxWidthWrapper';
import MagicBadge from '../components/ui/magic-badge';
import { Button } from '@/components/ui/button';

const steps = [
  {
    title: 'Enter Trade Intent',
    description: 'Describe your idea. The AI turns it into a clear, structured plan.',
  },
  {
    title: 'AI Structures Risk',
    description: 'Get defined risk, targets, and position sizing before you act.',
  },
  {
    title: 'Execute With Clarity',
    description: 'Trade with a checklist, not on impulse.',
  },
];

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <Navbar onTryDemo={() => setAuthOpen(true)} onLogin={() => setAuthOpen(true)} />

      {/* Hero - Linkify style */}
      <header className="relative overflow-hidden border-b border-white/5">
        {/* Grid background */}
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,80,220,0.2),transparent)]" />

        <MaxWidthWrapper className="relative py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <MagicBadge title="✨ Trade smarter →" className="mb-6" />
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Trade With Intelligence.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500">
                Not Impulse.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              AI-native trading copilot for structured, risk-aware decisions.
            </p>
            <Button
              size="lg"
              className="mt-10 gap-2 rounded-xl px-8 py-6 text-base font-semibold"
              onClick={() => setAuthOpen(true)}
            >
              Try Demo
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </MaxWidthWrapper>
      </header>

      {/* How It Works - Linkify process style */}
      <section id="features" className="border-b border-white/5 py-20 sm:py-28">
        <MaxWidthWrapper>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Effortless trading in 3 steps
            </h2>
            <p className="mt-4 text-muted-foreground">
              Follow these steps to structure risk, define targets, and execute with clarity.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="group relative rounded-2xl border border-border bg-card p-6 sm:p-8 transition-colors hover:border-white/10 hover:bg-card/80"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </MaxWidthWrapper>
      </section>

      {/* Footer CTA */}
      <footer className="border-t border-white/5 py-12">
        <MaxWidthWrapper>
          <p className="text-center text-sm text-muted-foreground">
            Ready to trade with clarity?{' '}
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="font-medium text-primary hover:underline"
            >
              Try Demo
            </button>
            {' or '}
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="font-medium text-primary hover:underline"
            >
              Sign In
            </button>
            .
          </p>
        </MaxWidthWrapper>
      </footer>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { Icons } from "@/components/global/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInForm, SignUpForm } from "@/components";
import { ConnectWalletButton } from "@/components/auth/connect-wallet-button";

export function AuthModal() {
  const authModal = useAuthModal();
  const router = useRouter();
  if (!authModal) return null;
  const { open, mode, setOpen } = authModal;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-[420px] gap-0 overflow-hidden border border-white/10 bg-neutral-950 p-0 shadow-2xl sm:rounded-2xl [&>button]:text-neutral-400 [&>button]:hover:text-white [&>button]:right-4 [&>button]:top-4"
        aria-describedby={undefined}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/10 px-6 py-5">
            <Icons.logo className="size-8 text-white" />
            <DialogTitle className="text-lg font-semibold text-white">
              {mode === "signup" ? "Create account" : "Sign in to FinArc"}
            </DialogTitle>
          </div>

          <div className="flex flex-col px-6 pb-6 pt-5">
            {mode === "signin" ? (
              <>
                {/* Connect wallet — use your wallet for trading (Hyperliquid, etc.) */}
                <ConnectWalletButton
                  onSuccess={() => {
                    setOpen(false);
                    router.push("/dashboard");
                  }}
                />
                <p className="mt-2 text-center text-xs text-neutral-500">
                  Use your wallet to deposit and trade. No email required.
                </p>

                {/* Demo login */}
                <Button
                  asChild
                  variant="outline"
                  className="mt-3 h-11 w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/dashboard">Demo login</Link>
                </Button>
                <p className="mt-2 text-center text-xs text-neutral-500">
                  Try the app without signing in.
                </p>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-neutral-950 px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                      Or sign in with email
                    </span>
                  </div>
                </div>

                <SignInForm
                  hideTitle
                  onSuccess={() => setOpen(false)}
                />
              </>
            ) : (
              <>
                {/* Connect wallet — use your wallet for trading (MetaMask, etc.) */}
                <ConnectWalletButton
                  onSuccess={() => {
                    setOpen(false);
                    router.push("/dashboard");
                  }}
                />
                <p className="mt-2 text-center text-xs text-neutral-500">
                  Use your wallet to deposit and trade. No email required.
                </p>

                {/* Demo mode */}
                <Button
                  asChild
                  variant="outline"
                  className="mt-3 h-11 w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/dashboard">Demo login</Link>
                </Button>
                <p className="mt-2 text-center text-xs text-neutral-500">
                  Try the app without creating an account.
                </p>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-neutral-950 px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                      Or create an account
                    </span>
                  </div>
                </div>

                <SignUpForm onSuccess={() => setOpen(false)} />
              </>
            )}

            {/* Terms (signin) or Sign in link (signup) */}
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              {mode === "signin" ? (
                <>
                  <p className="text-center text-[11px] text-neutral-500">
                    By signing in, you agree to our{" "}
                    <Link
                      href="/terms"
                      className="text-neutral-400 underline hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-neutral-400 underline hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                  <p className="text-center text-sm text-neutral-500">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      className="font-medium text-white underline hover:no-underline"
                      onClick={() => authModal.openSignUp()}
                    >
                      Sign up
                    </button>
                  </p>
                </>
              ) : (
                <p className="text-center text-sm text-neutral-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="font-medium text-white underline hover:no-underline"
                    onClick={() => authModal.openSignIn()}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

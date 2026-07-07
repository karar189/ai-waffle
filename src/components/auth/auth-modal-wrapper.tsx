"use client";

import { AuthModal } from "@/components/auth/auth-modal";
import { AuthModalProvider } from "@/contexts/auth-modal-context";

export function AuthModalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthModalProvider>
      <AuthModal />
      {children}
    </AuthModalProvider>
  );
}

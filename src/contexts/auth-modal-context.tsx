"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type AuthModalMode = "signin" | "signup";

type AuthModalContextValue = {
  open: boolean;
  mode: AuthModalMode;
  setOpen: (open: boolean) => void;
  openSignIn: () => void;
  openSignUp: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("signin");
  const searchParams = useSearchParams();

  const openSignIn = useCallback(() => {
    setMode("signin");
    setOpen(true);
  }, []);

  const openSignUp = useCallback(() => {
    setMode("signup");
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!searchParams) return;
    const auth = searchParams.get("auth");
    if (auth === "signin") {
      setMode("signin");
      setOpen(true);
    } else if (auth === "signup") {
      setMode("signup");
      setOpen(true);
    }
  }, [searchParams]);

  const value: AuthModalContextValue = { open, mode, setOpen, openSignIn, openSignUp };
  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) return null;
  return ctx;
}

"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "./wallet-provider";

interface Props {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

export default function Providers({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>{children}</WalletProvider>
    </QueryClientProvider>
  );
}

"use client";

import { useConnect, useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useCallback } from "react";
import { cn } from "@/utils";

interface ConnectWalletButtonProps {
  onSuccess?: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
}

export function ConnectWalletButton({ onSuccess, className, variant = "outline" }: ConnectWalletButtonProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = useCallback(() => {
    const injected = connectors.find((c) => c.id === "injected" || c.name.toLowerCase().includes("metamask"));
    const connector = injected ?? connectors[0];
    if (connector) {
      connect(
        { connector },
        {
          onSuccess: () => {
            onSuccess?.();
          },
        }
      );
    }
  }, [connectors, connect, onSuccess]);

  if (isConnected && address) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={className}
        onClick={() => disconnect()}
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn("border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white h-11 w-full", className)}
      onClick={handleConnect}
      disabled={isPending}
    >
      <Wallet className="mr-2 size-4 shrink-0" />
      {isPending ? "Connecting…" : "Connect wallet"}
    </Button>
  );
}

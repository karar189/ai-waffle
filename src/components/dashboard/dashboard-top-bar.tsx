"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Settings, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/utils";
import brandLogo from "@/assets/image.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/mock-auth";
import { agentApi } from "@/lib/agent/client";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Agent", href: "/dashboard/agent" },
  { label: "Markets", href: "/dashboard/markets" },
];

const SETTINGS_MENU_ITEMS = [
  { label: "Preferences", href: "#" },
  { label: "Notifications", href: "#" },
  { label: "MCP servers", href: "#" },
];

export function DashboardTopBar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { signOut } = useAuth();
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    agentApi
      .status()
      .then((s) => setAccount(s.connectedAccount))
      .catch(() => {});
  }, []);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/dashboard/"
      : pathname.startsWith(href);

  const handleLogout = () => {
    signOut();
    router.push("/?auth=signin");
  };

  const connectWallet = async () => {
    setConnecting(true);
    try {
      const w = window as unknown as {
        CasperWalletProvider?: () => {
          requestConnection: () => Promise<boolean>;
          getActivePublicKey: () => Promise<string>;
        };
      };
      let pk: string | null = null;
      if (w.CasperWalletProvider) {
        const provider = w.CasperWalletProvider();
        await provider.requestConnection();
        pk = await provider.getActivePublicKey();
      } else {
        pk =
          window
            .prompt("Casper Wallet not detected. Paste a Casper public key (hex) to use as the account:")
            ?.trim() || null;
      }
      if (pk) {
        await agentApi.updatePolicy({ connectedAccount: pk });
        setAccount(pk);
      }
    } catch {
      /* user cancelled or connection failed */
    } finally {
      setConnecting(false);
    }
  };

  const walletLabel = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : connecting
      ? "Connecting…"
      : "Connect wallet";

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-black/10 bg-white px-4 md:px-6">
      {/* Left: brand */}
      <Link href="/dashboard" className="flex items-center shrink-0">
        <Image
          src={brandLogo}
          alt="Waffle Trade"
          width={56}
          height={56}
          className="h-12 w-12 object-contain"
          priority
        />
      </Link>

      {/* Center: nav links */}
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-base font-medium transition-colors duration-200",
              isActive(item.href) ? "text-black" : "text-gray-700 hover:text-black"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right: connect wallet + settings */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={connectWallet}
          disabled={connecting}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-70"
        >
          <Wallet className="size-4" />
          <span className={account ? "font-mono text-xs" : ""}>{walletLabel}</span>
        </button>

        {/* Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 text-gray-600 hover:bg-black/5 hover:text-black rounded-full" aria-label="Settings">
              <Settings className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem] rounded-2xl border border-black/10 bg-white py-1.5 shadow-xl text-black" sideOffset={8}>
            <DropdownMenuLabel className="text-gray-500 font-normal">Settings</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-black/10" />
            {SETTINGS_MENU_ITEMS.map((item) => (
              <DropdownMenuItem key={item.label} asChild className="cursor-pointer text-black focus:bg-black/5 focus:text-black">
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-black/10" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer focus:bg-black/5 text-red-600 focus:text-red-600"
            >
              <LogOut className="size-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

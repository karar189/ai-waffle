"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn, NAV_LINKS } from "@/utils";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { useAuth } from "@/lib/mock-auth";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const MobileNavbar = () => {
  const { isSignedIn } = useAuth();
  const authModal = useAuthModal();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex lg:hidden items-center justify-end">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-screen">
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-3 right-5 text-neutral-600"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex flex-col items-start w-full py-2 mt-10">
            <div className="flex flex-col gap-2 w-full">
              {isSignedIn ? (
                <Link href="/dashboard" className={buttonVariants({ variant: "outline", className: "w-full" })} onClick={() => setIsOpen(false)}>
                  Dashboard
                </Link>
              ) : (
                <>
                  <Button variant="outline" className="w-full" onClick={() => { authModal?.openSignIn(); setIsOpen(false); }}>
                    Sign In
                  </Button>
                  <Button className="w-full" onClick={() => { authModal?.openSignUp(); setIsOpen(false); }}>
                    Sign Up
                  </Button>
                </>
              )}
            </div>
            <ul className="flex flex-col w-full mt-6 gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center w-full py-3 px-2 rounded-md font-medium text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNavbar;

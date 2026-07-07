import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import MaxWidthWrapper from "@/components/global/MaxWidthWrapper";
import { NAV_LINKS } from "@/lib/nav-links";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar({ onTryDemo, onLogin }) {
  const [scroll, setScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScroll(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors",
        scroll ? "border-b border-white/10 bg-background/80 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      )}
    >
      <MaxWidthWrapper>
        <div className="flex h-14 sm:h-16 items-center justify-between gap-6">
          <Link
            href="/"
            className="text-lg font-semibold text-white hover:text-primary transition-colors shrink-0"
          >
            Trading Copilot
          </Link>

          <NavigationMenu className="max-w-max">
            <NavigationMenuList className="flex-1 gap-1 text-foreground">
              {NAV_LINKS.map((link) =>
                link.menu ? (
                  <NavigationMenuItem key={link.title}>
                    <NavigationMenuTrigger className="bg-transparent text-white/90 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10">
                      {link.title}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="min-w-[240px] rounded-lg border border-border bg-popover p-2 text-popover-foreground">
                      <ul className="grid gap-1">
                        {link.menu.map((item) => (
                          <li key={item.title}>
                            <NavigationMenuLink asChild>
                              <a
                                href={item.href}
                                className="block select-none rounded-md p-3 leading-none no-underline outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              >
                                <div className="font-medium">{item.title}</div>
                                <p className="line-clamp-2 text-sm text-muted-foreground mt-0.5">
                                  {item.tagline}
                                </p>
                              </a>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ) : (
                  <NavigationMenuItem key={link.title}>
                    <NavigationMenuLink asChild>
                      <a
                        href={link.href}
                        className="inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
                      >
                        {link.title}
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              )}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:bg-white/10 hover:text-white"
              onClick={onLogin}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              onClick={onTryDemo}
            >
              <Zap className="size-3.5" />
              Get Started
            </Button>
          </div>
        </div>
      </MaxWidthWrapper>
    </header>
  );
}

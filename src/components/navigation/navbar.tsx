"use client";

import { buttonVariants } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { cn, NAV_LINKS } from "@/utils";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { useClerk } from "@/lib/mock-auth";
import { SearchIcon, UserIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import MaxWidthWrapper from "../global/max-width-wrapper";
import MobileNavbar from "./mobile-navbar";
import AnimationContainer from "../global/animation-container";

const Navbar = () => {

    const { user } = useClerk();
    const authModal = useAuthModal();

    const [scroll, setScroll] = useState(false);

    const handleScroll = () => {
        if (window.scrollY > 8) {
            setScroll(true);
        } else {
            setScroll(false);
        }
    };

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <header className={cn(
            "sticky top-0 inset-x-0 h-14 w-full border-b border-transparent z-[99999] select-none",
            scroll && "border-background/80 bg-background/40 backdrop-blur-md"
        )}>
            <AnimationContainer reverse delay={0.1} className="size-full">
                <MaxWidthWrapper className="flex items-center justify-between">
                    <div className="flex items-center space-x-12">
                        <Link href="/#home">
                            <span className="text-lg font-bold font-heading !leading-none">
                                FinArc
                            </span>
                        </Link>

                        <NavigationMenu className="hidden lg:flex">
                            <NavigationMenuList className="gap-1">
                                {NAV_LINKS.map((link) => (
                                    <NavigationMenuItem key={link.title}>
                                        <Link href={link.href} legacyBehavior passHref>
                                            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                                {link.title}
                                            </NavigationMenuLink>
                                        </Link>
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>

                    </div>

                    <div className="hidden lg:flex items-center gap-x-2">
                        <Link
                            href="/#features"
                            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                            aria-label="Search"
                        >
                            <SearchIcon className="size-5" />
                        </Link>
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                                aria-label="Dashboard"
                            >
                                <UserIcon className="size-5" />
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => authModal?.openSignIn()}
                                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                                aria-label="Sign in"
                            >
                                <UserIcon className="size-5" />
                            </button>
                        )}
                        {!user && (
                            <button
                                type="button"
                                onClick={() => authModal?.openSignUp()}
                                className={buttonVariants({ size: "sm" })}
                            >
                                Get Started
                                <ZapIcon className="size-3.5 ml-1.5 text-orange-500 fill-orange-500" />
                            </button>
                        )}
                    </div>

                    <MobileNavbar />

                </MaxWidthWrapper>
            </AnimationContainer>
        </header>
    )
};

export default Navbar

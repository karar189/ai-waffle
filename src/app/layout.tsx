import { AuthModalWrapper } from "@/components/auth/auth-modal-wrapper";
import { Providers } from "@/components";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import { aeonik, inter } from "@/utils/constants/fonts";
import { cn, generateMetadata } from "@/utils";
import { Suspense } from "react";

export const metadata = generateMetadata();

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="scrollbar dark">
            <body
                className={cn(
                    "min-h-screen bg-neutral-950 text-neutral-100 antialiased !font-default",
                    aeonik.variable,
                    inter.variable,
                )}
            >
                <Providers>
                    <Suspense fallback={null}>
                        <AuthModalWrapper>
                            {children}
                        </AuthModalWrapper>
                    </Suspense>
                    <Toaster richColors theme="dark" position="top-right" />
                </Providers>
            </body>
        </html>
    );
};

{/* <div className="absolute top-0 z-[-2] h-screen w-screen bg-background bg-[radial-gradient(100%_50%_at_50%_0%,rgba(168,85,247,0.13)_0,rgba(168,85,247,0)_50%,rgba(168,85,247,0)_100%)]"></div> */ }
{/* <AnimatedBackground
                    numSquares={6}
                    maxOpacity={0.2}
                    duration={10}
                    repeatDelay={10}
                    className={cn(
                        "[mask-image:radial-gradient(800px_circle_at_center,black,transparent)]",
                        "inset-0 w-full h-[100%] inset-y-[-30%] hidden md:block",
                    )}
                /> */}
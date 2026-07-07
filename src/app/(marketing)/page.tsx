"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoIcon } from "@/components/halo/logo-icon";

const NAV_LINKS: { label: string; href: string }[] = [
    { label: "Pricing", href: "/pricing" },
    { label: "Enterprise", href: "/enterprise" },
    { label: "Changelog", href: "/changelog" },
    { label: "Help", href: "/resources/help" },
    { label: "News", href: "/resources/blog" },
];

const HERO_BRANDS: { name: string; style: React.CSSProperties }[] = [
    { name: "Stripe", style: { fontFamily: "Georgia, serif", fontWeight: 700, letterSpacing: "-0.02em", fontSize: "15px" } },
    { name: "Coinbase", style: { fontFamily: "Arial, sans-serif", fontWeight: 900, letterSpacing: "0.08em", fontSize: "13px", textTransform: "uppercase" } },
    { name: "Uniswap", style: { fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 600, letterSpacing: "0.01em", fontSize: "15px", fontStyle: "italic" } },
    { name: "Aave", style: { fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: "0.12em", fontSize: "13px", textTransform: "uppercase" } },
    { name: "Compound", style: { fontFamily: "Palatino, 'Book Antiqua', serif", fontWeight: 400, letterSpacing: "-0.01em", fontSize: "16px" } },
    { name: "MakerDAO", style: { fontFamily: "Impact, 'Arial Narrow', sans-serif", fontWeight: 400, letterSpacing: "0.04em", fontSize: "14px" } },
    { name: "Chainlink", style: { fontFamily: "Verdana, sans-serif", fontWeight: 700, letterSpacing: "-0.03em", fontSize: "13px" } },
];

const BACKERS: { name: string; style: React.CSSProperties }[] = [
    { name: "Fundamental Labs", style: { fontFamily: "'Times New Roman', serif", fontWeight: 400, letterSpacing: "0.02em", fontSize: "14px" } },
    { name: "KUCOIN", style: { fontFamily: "'Arial Black', sans-serif", fontWeight: 900, letterSpacing: "0.08em", fontSize: "16px" } },
    { name: "NGC", style: { fontFamily: "Impact, sans-serif", fontWeight: 700, letterSpacing: "0.05em", fontSize: "18px" } },
    { name: "NxGen", style: { fontFamily: "Georgia, serif", fontWeight: 600, letterSpacing: "-0.02em", fontSize: "17px" } },
    { name: "Matter Labs", style: { fontFamily: "Helvetica, sans-serif", fontWeight: 700, letterSpacing: "-0.01em", fontSize: "15px" } },
    { name: "DEXTools", style: { fontFamily: "Verdana, sans-serif", fontWeight: 700, letterSpacing: "0.06em", fontSize: "14px", textTransform: "uppercase" } },
    { name: "NGRAVE", style: { fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: "0.18em", fontSize: "14px" } },
    { name: "Polychain", style: { fontFamily: "Palatino, serif", fontWeight: 500, letterSpacing: "0.03em", fontSize: "15px" } },
];

const Navbar = () => (
    <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-5">
        <div className="max-w-[88rem] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
                <LogoIcon className="w-7 h-7 text-black" />
                <span className="text-2xl font-medium tracking-tight text-black">Halo</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
                {NAV_LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="text-base text-gray-700 hover:text-black font-medium transition-colors duration-200"
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
            <Link
                href="/dashboard"
                className="bg-black text-white text-base font-medium px-7 py-2.5 rounded-full hover:bg-gray-800 transition-colors duration-200"
            >
                Launch
            </Link>
        </div>
    </nav>
);

const BrandMarquee = () => (
    <div className="mt-24 w-full max-w-md overflow-hidden">
        <style>{`
            @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .marquee-track {
                display: flex;
                width: max-content;
                animation: marquee 22s linear infinite;
            }
        `}</style>
        <div className="marquee-track">
            {[...HERO_BRANDS, ...HERO_BRANDS].map((brand, i) => (
                <span
                    key={`${brand.name}-${i}`}
                    className="mx-7 shrink-0 text-black/60 whitespace-nowrap"
                    style={brand.style}
                >
                    {brand.name}
                </span>
            ))}
        </div>
    </div>
);

const HeroSection = () => (
    <section className="flex-1 px-6 pt-20 pb-6 flex items-end">
        <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{ height: "calc(100vh - 96px)" }}
        >
            <video
                autoPlay
                muted
                loop
                playsInline
                className="object-cover absolute inset-0 w-full h-full"
            >
                <source
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4"
                    type="video/mp4"
                />
            </video>

            <div className="relative z-10 flex flex-col items-start justify-start h-full p-12 pt-36">
                <h1
                    className="text-black text-5xl md:text-6xl font-medium leading-tight max-w-xl mb-4"
                    style={{ letterSpacing: "-0.04em" }}
                >
                    Your Wealth
                    <br />
                    Works
                </h1>
                <p
                    className="text-black/70 text-base md:text-lg max-w-md mb-8 leading-relaxed"
                    style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
                >
                    An automated, reward-powered digital dollar built for native passive earnings and effortless connection into DeFi.
                </p>
                <Link
                    href="/auth/sign-up"
                    className="inline-flex items-center gap-3 bg-black text-white text-base md:text-lg font-medium pl-8 pr-2 py-2 rounded-full hover:bg-gray-800 transition-colors duration-200"
                >
                    Join us
                    <span className="bg-white rounded-full p-2 hover:bg-white transition-colors duration-200">
                        <ArrowRight className="w-5 h-5 text-black" />
                    </span>
                </Link>

                <BrandMarquee />
            </div>
        </div>
    </section>
);

const ArrowPill = ({ label, href }: { label: string; href: string }) => (
    <Link
        href={href}
        className="inline-flex items-center gap-3 bg-black text-white text-base font-medium pl-8 pr-2 py-2 rounded-full hover:bg-gray-800 transition-colors duration-200"
    >
        {label}
        <span className="bg-white rounded-full p-2 hover:bg-white transition-colors duration-200">
            <ArrowRight className="w-5 h-5 text-black" />
        </span>
    </Link>
);

const InfoSection = () => (
    <section className="bg-[#F5F5F5] px-6 py-24">
        <div className="max-w-[88rem] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-start">
                <div>
                    <h2
                        className="text-black text-4xl md:text-5xl font-medium leading-tight mb-8"
                        style={{ letterSpacing: "-0.03em" }}
                    >
                        Meet USD Halo.
                    </h2>
                    <ArrowPill label="Discover it" href="/pricing" />
                </div>
                <p className="text-black/70 text-2xl md:text-3xl leading-relaxed">
                    USD Halo is a reward-earning dollar coin that lets your savings grow while remaining tied to the U.S. dollar.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    className="rounded-2xl lg:col-span-2"
                    style={{
                        backgroundImage:
                            "url('https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260423_164207_f243351d-ed59-48ec-83a0-a5e996bdbe3c.png&w=1280&q=85')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                >
                    <div className="p-7 min-h-80 flex flex-col justify-between">
                        <h3
                            className="text-black text-2xl font-medium leading-snug"
                            style={{ letterSpacing: "-0.02em" }}
                        >
                            Savings that bloom
                        </h3>
                        <p className="text-black/70 text-base max-w-xs">
                            Gain steady returns as your dollar tokens are routed into top-performing DeFi strategies.
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl bg-[#2B2644] p-7 min-h-80 flex flex-col justify-between">
                    <h3 className="text-white text-2xl font-medium leading-snug">
                        Always fluid,
                        <br />
                        always pegged.
                    </h3>
                    <p className="text-white/60 text-base">
                        Keep fully dollar-anchored with on-demand access to funds — no lockups or waits.
                    </p>
                </div>

                <div className="rounded-2xl bg-[#2B2644] p-7 min-h-80 flex flex-col justify-between">
                    <h3 className="text-white text-2xl font-medium leading-snug">
                        Fully
                        <br />
                        automated
                    </h3>
                    <p className="text-white/60 text-base">
                        Skip the task of tuning positions yourself. USD Halo runs in the background for you.
                    </p>
                </div>
            </div>
        </div>
    </section>
);

const BackedBySection = () => (
    <section className="bg-[#F5F5F5] px-6">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
            <p className="text-black/70 text-base leading-relaxed">
                Funded by premier partners
                <br />
                and forward-thinking leaders.
            </p>
            <div className="md:col-span-3 overflow-hidden">
                <style>{`
                    @keyframes backers-marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .backers-track {
                        display: flex;
                        width: max-content;
                        animation: backers-marquee 30s linear infinite;
                    }
                `}</style>
                <div className="backers-track">
                    {[...BACKERS, ...BACKERS].map((brand, i) => (
                        <span
                            key={`${brand.name}-${i}`}
                            className="mx-10 shrink-0 text-black/50 whitespace-nowrap"
                            style={brand.style}
                        >
                            {brand.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

const UseCasesSection = () => (
    <section className="bg-[#F5F5F5] px-6 py-24">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="md:pr-12 md:pt-2">
                <p className="text-black/60 text-sm mb-2">USD Halo in Practice</p>
                <h2
                    className="text-black text-5xl md:text-6xl font-medium leading-none mb-6"
                    style={{ letterSpacing: "-0.04em" }}
                >
                    Use modes
                </h2>
                <p className="text-black/60 text-base leading-relaxed max-w-sm">
                    USD Halo powers a wide range of modes for builders, companies and treasuries wanting safe and rewarding stablecoin integrations plus more
                </p>
            </div>

            <div className="group relative rounded-3xl overflow-hidden min-h-[720px]">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="object-cover absolute inset-0 w-full h-full"
                >
                    <source
                        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4"
                        type="video/mp4"
                    />
                </video>

                <div className="relative z-10 p-10 md:p-12">
                    <h3
                        className="text-black text-4xl md:text-5xl font-medium leading-tight mb-5"
                        style={{ letterSpacing: "-0.03em" }}
                    >
                        Commerce
                    </h3>
                    <p className="text-black/70 text-base max-w-md mb-8">
                        Lift customer retention by offering USD Halo, a trusted dollar-backed stablecoin with strong yields, letting your patrons earn with zero effort on your platform.
                    </p>
                    <Link href="/enterprise" className="inline-flex items-center gap-3 text-black font-medium">
                        <span className="w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center group-hover:bg-white transition-colors">
                            <ArrowRight className="w-4 h-4 text-black" />
                        </span>
                        Know more
                    </Link>
                </div>
            </div>
        </div>
    </section>
);

const HomePage = () => {
    return (
        <div className="flex flex-col bg-[#F5F5F5]">
            <div className="h-screen flex flex-col overflow-hidden">
                <Navbar />
                <HeroSection />
            </div>
            <InfoSection />
            <BackedBySection />
            <UseCasesSection />
        </div>
    );
};

export default HomePage;

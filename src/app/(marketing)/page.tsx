"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Activity,
    ArrowRight,
    Bot,
    CheckCircle2,
    Coins,
    GitBranch,
    LockKeyhole,
    Network,
    PauseCircle,
    ShieldCheck,
    Sparkles,
    Zap,
} from "lucide-react";
import brandLogo from "@/assets/image.png";

const NAV_LINKS = [
    { label: "Product", href: "#product" },
    { label: "Autonomy", href: "#autonomy" },
    { label: "Safety", href: "#safety" },
    { label: "MCP", href: "#mcp" },
];

const PROOF_STRIP = [
    "CSPR.cloud",
    "Casper Testnet",
    "CSPR.trade LP",
    "MCP Server",
    "LLM Veto",
    "Session Key",
    "Guardrails",
];

const PIPELINE = [
    {
        icon: Activity,
        title: "Monitor",
        text: "Live Casper reads for validators, rewards, swaps, reserves, wallet balances, and delegations.",
    },
    {
        icon: GitBranch,
        title: "Decide",
        text: "Risk-adjusted ranking compares staking and CSPR-paired LP venues against your policy.",
    },
    {
        icon: Bot,
        title: "Review",
        text: "OpenAI or Claude gets a structured verdict layer and can veto an otherwise valid move.",
    },
    {
        icon: Zap,
        title: "Rebalance",
        text: "Small moves auto-sign with a session key; larger moves route through Casper Wallet approval.",
    },
];

const SAFETY = [
    {
        icon: ShieldCheck,
        title: "Policy guardrails",
        text: "Max move size, venue caps, cooldown, minimum liquidity, and allowed venue kinds are checked before execution.",
    },
    {
        icon: LockKeyhole,
        title: "Hybrid signing",
        text: "The agent can automate small testnet moves while still requiring a human signature for bigger changes.",
    },
    {
        icon: PauseCircle,
        title: "Stop controls",
        text: "Pause and emergency stop controls halt proposals and execution, including the server-side scheduler.",
    },
];

const MCP_TOOLS = [
    "get_yield_snapshot",
    "get_wallet_state",
    "propose_rebalance",
    "execute_rebalance",
    "quote_lp_deposit",
    "execute_lp_withdraw",
];

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
};

const softScale = {
    hidden: { opacity: 0, scale: 0.985 },
    show: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    },
};

const stagger = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.09, delayChildren: 0.12 },
    },
};

const Navbar = () => (
    <motion.nav
        className="absolute left-0 right-0 top-0 z-20 px-6 py-5"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
        <div className="mx-auto flex max-w-[88rem] items-center justify-between">
            <Link href="/" className="flex items-center">
                <Image
                    src={brandLogo}
                    alt="Waffle Trade"
                    width={60}
                    height={60}
                    className="h-14 w-14 object-contain"
                    priority
                />
            </Link>

            <div className="hidden items-center gap-8 md:flex">
                {NAV_LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="text-base font-medium text-black/60 transition-colors hover:text-black"
                    >
                        {link.label}
                    </Link>
                ))}
            </div>

            <Link
                href="/dashboard/agent"
                className="rounded-full bg-black px-7 py-2.5 text-base font-medium text-white transition-colors hover:bg-black/82"
            >
                Launch
            </Link>
        </div>
    </motion.nav>
);

const ProofMarquee = () => (
    <div className="mt-16 w-full max-w-xl overflow-hidden">
        <style>{`
            @keyframes proof-marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .proof-track {
                display: flex;
                width: max-content;
                animation: proof-marquee 24s linear infinite;
            }
        `}</style>
        <div className="proof-track">
            {[...PROOF_STRIP, ...PROOF_STRIP].map((item, i) => (
                <span
                    key={`${item}-${i}`}
                    className="mx-7 shrink-0 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.12em] text-black/45"
                >
                    {item}
                </span>
            ))}
        </div>
    </div>
);

const ArrowPill = ({ label, href, light = false }: { label: string; href: string; light?: boolean }) => (
    <Link
        href={href}
        className={[
            "inline-flex items-center gap-3 rounded-full py-2 pl-8 pr-2 text-base font-medium transition-colors",
            light ? "bg-white text-black hover:bg-white/88" : "bg-black text-white hover:bg-black/82",
        ].join(" ")}
    >
        {label}
        <span className={["rounded-full p-2", light ? "bg-black" : "bg-white"].join(" ")}>
            <ArrowRight className={["h-5 w-5", light ? "text-white" : "text-black"].join(" ")} />
        </span>
    </Link>
);

const HeroSection = () => (
    <section className="flex min-h-screen flex-col bg-[#F7F2FF] px-6 pb-6 pt-20">
        <motion.div
            className="relative flex flex-1 overflow-hidden rounded-2xl bg-[#E9DDFB]"
            variants={softScale}
            initial="hidden"
            animate="show"
        >
            <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
            >
                <source
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4"
                    type="video/mp4"
                />
            </video>

            <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 pt-28 md:p-12 md:pt-36">
                <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="max-w-4xl rounded-[2rem] bg-white/62 p-6 backdrop-blur-sm md:p-8"
                >
                    <motion.div
                        variants={fadeUp}
                        className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-black/65 backdrop-blur"
                    >
                        <Network className="h-4 w-4 text-[#7C3AED]" />
                        Autonomous yield routing by Waffle Trade
                    </motion.div>
                    <motion.h1
                        variants={fadeUp}
                        className="font-roboto max-w-3xl text-5xl font-medium leading-[1.1] tracking-tight text-black md:text-7xl"
                    >
                        Waffle Trade,
                        <br />
                        on <span className="font-bodoni italic">autopilot</span>.
                    </motion.h1>
                    <motion.p variants={fadeUp} className="mt-5 max-w-lg text-base leading-relaxed text-black/68 md:text-lg">
                        A self-driving protocol that monitors live Casper yields, proposes safer reallocations,
                        and executes staking or CSPR.trade LP moves with guardrails, LLM review, and MCP control.
                    </motion.p>
                    <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <ArrowPill label="Open agent" href="/dashboard/agent" />
                        <Link
                            href="#product"
                            className="inline-flex items-center justify-center rounded-full bg-white/72 px-7 py-3 font-medium text-black backdrop-blur transition hover:bg-white"
                        >
                            See the loop
                        </Link>
                    </motion.div>
                    <motion.div variants={fadeUp}>
                        <ProofMarquee />
                    </motion.div>
                </motion.div>

                <motion.div
                    className="mt-12 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4"
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                >
                    {[
                        ["Live", "CSPR.cloud reads"],
                        ["11", "MCP tools"],
                        ["24/7", "scheduler loop"],
                        ["LP", "enter and exit"],
                    ].map(([value, label]) => (
                        <motion.div key={label} variants={fadeUp} className="rounded-lg bg-white/68 p-4 backdrop-blur">
                            <p className="text-2xl font-semibold text-black">{value}</p>
                            <p className="mt-1 text-sm text-black/52">{label}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </motion.div>
    </section>
);

const ProductSection = () => (
    <motion.section
        id="product"
        className="scroll-mt-10 bg-[#F7F2FF] px-6 py-24 text-black"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
    >
        <div className="mx-auto max-w-[88rem]">
            <motion.div variants={fadeUp} className="mb-16 grid grid-cols-1 items-start gap-12 md:grid-cols-2">
                <div>
                    <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-black/45">
                        Product loop
                    </p>
                    <h2 className="text-4xl font-medium leading-tight md:text-5xl">
                        Meet Waffle Trade, the agent that actually does the work.
                    </h2>
                </div>
                <p className="text-2xl leading-relaxed text-black/68 md:text-3xl">
                    It is not just a dashboard. It is a monitor, decision engine, signing workflow,
                    execution trail, and MCP surface in one product.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {PIPELINE.map((item) => {
                    const Icon = item.icon;
                    return (
                        <motion.article key={item.title} variants={fadeUp} className="min-h-80 rounded-lg bg-white p-7 shadow-sm">
                            <Icon className="h-9 w-9 text-[#7C3AED]" />
                            <h3 className="mt-10 text-2xl font-medium leading-snug">{item.title}</h3>
                            <p className="mt-4 text-base leading-relaxed text-black/58">{item.text}</p>
                        </motion.article>
                    );
                })}
            </div>
        </div>
    </motion.section>
);

const AutonomySection = () => (
    <motion.section
        id="autonomy"
        className="scroll-mt-10 bg-[#F7F2FF] px-6 pb-24 text-black"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
    >
        <div className="mx-auto grid max-w-[88rem] grid-cols-1 items-start gap-8 md:grid-cols-2">
            <motion.div variants={fadeUp} className="md:pr-12 md:pt-2">
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-black/45">
                    Server-side autonomy
                </p>
                <h2 className="mb-6 text-5xl font-medium leading-none md:text-6xl">
                    Runs even when the page is closed.
                </h2>
                <p className="max-w-md text-base leading-relaxed text-black/60">
                    The scheduler starts on server boot, shares state with the dashboard, and runs monitor to decide
                    to execute cycles only when the agent is enabled.
                </p>
            </motion.div>

            <motion.div variants={softScale} className="group relative min-h-[680px] overflow-hidden rounded-2xl bg-[#3B1B5C]">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover opacity-48"
                >
                    <source
                        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4"
                        type="video/mp4"
                    />
                </video>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,242,255,0.66),rgba(247,242,255,0.24)_55%,rgba(48,21,78,0.56))]" />

                <div className="relative z-10 flex min-h-[680px] flex-col justify-between p-8 md:p-12">
                    <div>
                        <h3 className="text-4xl font-medium leading-tight text-black md:text-5xl">
                            Agent control room
                        </h3>
                        <p className="mt-5 max-w-md text-base leading-relaxed text-black/70">
                            Live status, proposals, AI verdict, LP tooling, policy sliders, and execution history all stay in sync.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {[
                            "Autonomous scheduler",
                            "CSPR.trade LP sagas",
                            "Execution proof links",
                            "Live on-chain quotes",
                        ].map((item) => (
                            <div key={item} className="flex items-center gap-3 rounded-lg bg-white/12 p-4 text-white backdrop-blur">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#E9D5FF]" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    </motion.section>
);

const SafetySection = () => (
    <motion.section
        id="safety"
        className="scroll-mt-10 bg-[#EEE6FA] px-6 py-24 text-black"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.22 }}
        variants={stagger}
    >
        <div className="mx-auto max-w-[88rem]">
            <motion.div variants={fadeUp} className="mb-12 max-w-3xl">
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-black/45">
                    Safety model
                </p>
                <h2 className="text-4xl font-medium leading-tight md:text-5xl">
                    Autonomy with visible brakes.
                </h2>
            </motion.div>

            <div className="grid gap-4 lg:grid-cols-3">
                {SAFETY.map((item) => {
                    const Icon = item.icon;
                    return (
                        <motion.article key={item.title} variants={fadeUp} className="min-h-72 rounded-lg bg-white p-7 shadow-sm">
                            <Icon className="h-9 w-9 text-[#7C3AED]" />
                            <h3 className="mt-9 text-2xl font-medium">{item.title}</h3>
                            <p className="mt-4 leading-relaxed text-black/60">{item.text}</p>
                        </motion.article>
                    );
                })}
            </div>
        </div>
    </motion.section>
);

const McpSection = () => (
    <motion.section
        id="mcp"
        className="scroll-mt-10 bg-[#F7F2FF] px-6 py-24 text-black"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.22 }}
        variants={stagger}
    >
        <div className="mx-auto grid max-w-[88rem] grid-cols-1 items-center gap-10 md:grid-cols-2">
            <motion.div variants={fadeUp}>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-black/45">
                    MCP native
                </p>
                <h2 className="text-5xl font-medium leading-none md:text-6xl">
                    Let another agent drive it.
                </h2>
                <p className="mt-6 max-w-lg text-base leading-relaxed text-black/60">
                    The project ships its own stdio MCP server so clients can inspect yield snapshots,
                    request proposals, quote LP routes, execute guarded moves, and read agent state.
                </p>
                <div className="mt-8">
                    <ArrowPill label="Open dashboard" href="/dashboard/agent" />
                </div>
            </motion.div>

            <motion.div variants={softScale} className="rounded-2xl bg-[#241338] p-6 text-white">
                <div className="mb-5 flex items-center gap-3">
                    <Coins className="h-6 w-6 text-[#E9D5FF]" />
                    <p className="text-lg font-medium">Agent tools</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {MCP_TOOLS.map((tool) => (
                        <code key={tool} className="rounded-lg bg-white/8 px-4 py-4 text-sm text-[#F3E8FF]">
                            {tool}
                        </code>
                    ))}
                </div>
            </motion.div>
        </div>
    </motion.section>
);

const CtaSection = () => (
    <motion.section
        className="bg-[#F7F2FF] px-6 pb-20 text-black"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
    >
        <motion.div variants={softScale} className="mx-auto flex max-w-[88rem] flex-col items-start justify-between gap-8 rounded-2xl bg-black p-8 text-white md:flex-row md:items-center md:p-12">
            <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-white/45">
                    Demo ready
                </p>
                <h2 className="max-w-2xl text-4xl font-medium leading-tight md:text-5xl">
                    Show the monitor, proposal, policy, MCP tools, and execution trail.
                </h2>
            </div>
            <ArrowPill label="Launch agent" href="/dashboard/agent" light />
        </motion.div>
    </motion.section>
);

const Footer = () => (
    <footer className="bg-[#F7F2FF] px-6 pb-8 text-black">
        <div className="mx-auto max-w-[88rem] border-t border-black/10 pt-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div className="max-w-sm">
                    <Link href="/" className="flex items-center">
                        <Image
                            src={brandLogo}
                            alt="Waffle Trade"
                            width={60}
                            height={60}
                            className="h-14 w-14 object-contain"
                        />
                    </Link>
                    <p className="mt-3 text-sm leading-relaxed text-black/55">
                        Autonomous yield routing on Casper with MCP control, guardrails, and a live agent dashboard.
                    </p>
                </div>

                <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-black/60">
                    {NAV_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} className="transition-colors hover:text-black">
                            {link.label}
                        </Link>
                    ))}
                    <Link href="/dashboard/agent" className="transition-colors hover:text-black">
                        Dashboard
                    </Link>
                </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 text-xs text-black/42 md:flex-row md:items-center md:justify-between">
                <p>© 2026 Waffle Trade. Built for Casper testnet demos.</p>
                <p>Not financial advice. Review every live transaction before signing.</p>
            </div>
        </div>
    </footer>
);

const HomePage = () => {
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.scrollBehavior;
        root.style.scrollBehavior = "smooth";
        return () => {
            root.style.scrollBehavior = previous;
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#F7F2FF]">
            <Navbar />
            <HeroSection />
            <ProductSection />
            <AutonomySection />
            <SafetySection />
            <McpSection />
            <CtaSection />
            <Footer />
        </div>
    );
};

export default HomePage;

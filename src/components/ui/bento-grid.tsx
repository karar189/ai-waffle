import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/utils";
import { ArrowRightIcon, BotIcon, CalendarCheckIcon, PlayCircleIcon, WaypointsIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Integrations } from "./integrations";
import { Label } from "./label";

export const CARDS = [
    {
        Icon: BotIcon,
        name: "Automate trade",
        description: "Set rules and let AI run your trades. Automate entries, exits, and risk management across markets.",
        href: "#",
        cta: "Learn more",
        className: "col-span-3 lg:col-span-1",
        background: (
            <Card className="absolute top-10 left-10 origin-top rounded-none rounded-tl-md transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_0%,#000_100%)] group-hover:scale-105 border border-border border-r-0">
                <CardHeader>
                    <CardTitle>
                        Automate trade
                    </CardTitle>
                    <CardDescription>
                        Define rules. AI handles execution and risk.
                    </CardDescription>
                </CardHeader>
                <CardContent className="-mt-4">
                    <Label>
                        Strategy name
                    </Label>
                    <Input
                        type="text"
                        placeholder="e.g. BTC breakout above 50k..."
                        className="w-full focus-visible:ring-0 focus-visible:ring-transparent"
                    />
                </CardContent>
            </Card>
        ),
    },
    {
        Icon: PlayCircleIcon,
        name: "Execute strategies",
        description: "Run your saved strategies with one click. Backtest, simulate, then go live when you're ready.",
        href: "#",
        cta: "Learn more",
        className: "col-span-3 lg:col-span-2",
        background: (
            <Command className="absolute right-10 top-10 w-[70%] origin-to translate-x-0 border border-border transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:-translate-x-10 p-2">
                <Input placeholder="Search strategies..." />
                <div className="mt-1 cursor-pointer">
                    <div className="px-4 py-2 hover:bg-muted rounded-md">finarc.io/strategy/1</div>
                    <div className="px-4 py-2 hover:bg-muted rounded-md">finarc.io/strategy/2</div>
                    <div className="px-4 py-2 hover:bg-muted rounded-md">finarc.io/portfolio</div>
                </div>
            </Command>
        ),
    },
    {
        Icon: WaypointsIcon,
        name: "Connect your apps",
        description: "Integrate with exchanges, brokers, and your favorite tools for seamless automation.",
        href: "#",
        cta: "Learn more",
        className: "col-span-3 lg:col-span-2 max-w-full overflow-hidden",
        background: (
            <Integrations className="absolute right-2 pl-28 md:pl-0 top-4 h-[300px] w-[600px] border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-105" />
        ),
    },
    {
        Icon: CalendarCheckIcon,
        name: "Calendar notifications",
        description: "Get reminders for trade windows, expiries, and key events. Never miss a setup.",
        className: "col-span-3 lg:col-span-1",
        href: "#",
        cta: "Learn more",
        background: (
            <Calendar
                mode="single"
                selected={new Date(2026, 1, 15, 0, 0, 0)}
                className="absolute right-0 top-10 origin-top rounded-md border border-border transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:scale-105"
            />
        ),
    },
];

const BentoGrid = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr min-h-0",
                className,
            )}
        >
            {children}
        </div>
    );
};

const BentoCard = ({
    name,
    className,
    background,
    Icon,
    description,
    href,
    cta,
}: {
    name: string;
    className: string;
    background: ReactNode;
    Icon: any;
    description: string;
    href: string;
    cta: string;
}) => (
    <div
        key={name}
        className={cn(
            "group relative col-span-3 flex flex-col justify-between border border-border/60 overflow-hidden rounded-xl min-h-[20rem]",
            "bg-card [box-shadow:0_-20px_80px_-20px_rgba(0,0,0,0.15)_inset]",
            className,
        )}
    >
        <div className="flex-1 min-h-0">{background}</div>
        <div className="pointer-events-none z-10 flex flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10 shrink-0">
            <Icon className="h-12 w-12 origin-left text-muted-foreground transition-all duration-300 ease-in-out group-hover:scale-75" />
            <h3 className="text-xl font-semibold text-foreground">
                {name}
            </h3>
            <p className="max-w-lg text-muted-foreground">{description}</p>
        </div>

        <div
            className={cn(
                "absolute bottom-0 flex w-full translate-y-10 flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 z-20",
            )}
        >
            <Link href={href} className={buttonVariants({ size: "sm", variant: "ghost", className: "cursor-pointer" })}>
                {cta}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
        </div>
        <div className="pointer-events-none absolute inset-0 transition-all duration-300 group-hover:bg-foreground/[.03]" />
    </div>
);

export { BentoCard, BentoGrid };

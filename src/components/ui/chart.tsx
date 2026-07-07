"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/utils";

const THEMES = { light: "light", dark: "dark" } as const;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<keyof typeof THEMES, string>;
  }
>;

type ChartContextProps = {
  config: ChartConfig;
  theme: keyof typeof THEMES;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    theme?: keyof typeof THEMES;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, theme = "dark", ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = id || `chart-${uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config, theme }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video max-h-[300px] w-full flex-col justify-center text-sm [&_.recharts-cartesian-grid_horizontal_line]:stroke-muted [&_.recharts-cartesian-grid_vertical_line]:stroke-muted [&_.recharts-curve]:stroke-[var(--color)] [&_.recharts-dot]:stroke-[var(--color)] [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-sector]:stroke-[var(--color)]",
          className
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      label,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      labelKey,
      nameKey,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      ...props
    },
    ref
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";
    const key = nameKey ?? (payload[0].dataKey as string);
    const itemConfig = config[key as keyof typeof config];
    const value =
      !hideLabel && typeof label !== "undefined"
        ? labelKey
          ? payload[0].payload[labelKey]
          : label
        : undefined;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
        {...props}
      >
        {!nestLabel && !hideLabel && value !== undefined ? (
          <div
            className={cn(
              "font-medium text-muted-foreground",
              labelClassName
            )}
          >
            {labelFormatter
              ? labelFormatter(value, payload.map((p) => p.payload))
              : value}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = nameKey ?? (item.dataKey as string);
            const itemConfig = config[key as keyof typeof config];
            const indicatorColor = color ?? item.payload.fill ?? item.color;

            return (
              <div
                key={item.dataKey as string}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-muted-foreground"
                )}
              >
                {!hideIndicator ? (
                  <div
                    className="shrink-0 rounded-[2px] border-[var(--color)] bg-[var(--color)]"
                    style={
                      {
                        "--color": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                ) : null}
                <div className="flex flex-1 justify-between leading-none">
                  <span className="text-muted-foreground">
                    {itemConfig?.label ?? (item.dataKey as string)}
                  </span>
                  {item.value && (
                    <span className="font-mono font-medium text-foreground">
                      {formatter
                        ? formatter(item.value, item.name, item, index, item.payload)
                        : item.value.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLOListElement,
  React.ComponentProps<"ol"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      nameKey?: string;
    }
>(({ className, payload, verticalAlign = "bottom", nameKey, ...props }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <ol
      ref={ref}
      className={cn(
        "flex flex-wrap justify-center gap-4 py-2",
        verticalAlign === "top" ? "flex-col-reverse" : "flex-col",
        className
      )}
      {...props}
    >
      {payload.map((item) => {
        const key = nameKey ?? (item.dataKey as string);
        const itemConfig = config[key as keyof typeof config];

        return (
          <li
            key={item.value}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:size-3.5 [&>svg]:text-muted-foreground"
            )}
          >
            <div
              className="shrink-0 rounded-[2px] border-[var(--color)] bg-[var(--color)]"
              style={
                {
                  "--color": item.color,
                } as React.CSSProperties
              }
            />
            <span className="text-muted-foreground">
              {itemConfig?.label ?? item.value}
            </span>
          </li>
        );
      })}
    </ol>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};

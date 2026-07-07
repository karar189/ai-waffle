import { NextResponse } from "next/server";
import { loadCasperMarkets } from "@/lib/markets/casper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await loadCasperMarkets();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to load Casper mainnet market data.",
      },
      { status: 502 }
    );
  }
}

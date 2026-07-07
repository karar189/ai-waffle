"use client";

import { createConfig, http, injected } from "@wagmi/core";
import { mainnet, arbitrum } from "wagmi/chains";

/** MetaMask / injected wallet only. Avoid the wagmi/connectors barrel; it imports optional connectors at build time. */
export const wagmiConfig = createConfig({
  chains: [mainnet, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
  },
  connectors: [injected()],
  ssr: true,
});

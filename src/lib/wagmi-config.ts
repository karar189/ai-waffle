"use client";

import { createConfig, http } from "wagmi";
import { mainnet, arbitrum } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/** MetaMask / injected wallet only. Other connectors are stubbed in next.config so the barrel doesn't break the build. */
export const wagmiConfig = createConfig({
  chains: [mainnet, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
  },
  connectors: [injected()],
  ssr: true,
});

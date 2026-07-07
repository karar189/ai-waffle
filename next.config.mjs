/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // MetaMask only: we use wagmi's injected() connector. The wagmi/connectors barrel
    // loads every connector (Porto, Coinbase, WalletConnect, etc.); stub their optional
    // deps so the build resolves and we never run that code at runtime.
    config.resolve.alias = {
      ...config.resolve.alias,
      "porto": false,
      "porto/internal": false,
      "@base-org/account": false,
      "@coinbase/wallet-sdk": false,
      "@metamask/sdk": false,
      "@safe-global/safe-apps-provider": false,
      "@safe-global/safe-apps-sdk": false,
      "@walletconnect/ethereum-provider": false,
    };
    return config;
  },
};

export default nextConfig;

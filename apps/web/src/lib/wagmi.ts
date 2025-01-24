import { createConfig } from '@privy-io/wagmi';
import { base, baseSepolia } from 'viem/chains';
import { http } from 'wagmi';

export const config = createConfig({
    chains: [base, baseSepolia],
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http()
    }
});
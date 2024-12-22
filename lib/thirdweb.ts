// import { ThirdwebSDK } from "@thirdweb-dev/react-native-adapter";
// import { ethers } from "ethers";
// import type { EIP1193Provider } from "@privy-io/expo";

// let sdk: ThirdwebSDK | null = null;

// export async function initializeThirdwebSDK(provider: EIP1193Provider) {
//     // Cast provider to 'any' to pass into Web3Provider (common practice)
//     const ethersProvider = new ethers.providers.Web3Provider(provider as any);
//     const signer = ethersProvider.getSigner();

//     // Initialize the Thirdweb SDK with the signer
//     sdk = new ThirdwebSDK(signer);
// }

// export function getThirdwebSDK(): ThirdwebSDK {
//     if (!sdk) {
//         throw new Error("Thirdweb SDK not initialized. Call initializeThirdwebSDK() after the wallet is connected.");
//     }
//     return sdk;
// }

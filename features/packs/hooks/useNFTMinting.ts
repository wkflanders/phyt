// import { useState, useCallback } from 'react';
// import { supabase } from '@/lib/supabase';
// import { type ThirdwebClient, getClient } from "thirdweb";
// import { NFT, NFTCollection, SmartContract } from "thirdweb/contracts";

// interface NFTMetadata {
//     name: string;
//     description: string;
//     image: string;
//     properties: {
//         minted_at: string;
//         source_metadata_id: string;
//     };
// }

// interface MintedNFT {
//     tokenId: string;
//     metadata: NFTMetadata;
// }

// interface UseNFTMintingReturn {
//     mintPack: (userId: string) => Promise<MintedNFT>;
//     getUserNFTs: (userId: string) => Promise<any[]>;
//     getAvailableCount: () => Promise<number | null>;
//     isMinting: boolean;
//     isLoading: boolean;
//     error: Error | null;
//     ownedNFTs: any[];
//     availableCount: number | null;
// }

// export const useNFTMinting = (): UseNFTMintingReturn => {
//     const [isMinting, setIsMinting] = useState(false);
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<Error | null>(null);
//     const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);
//     const [availableCount, setAvailableCount] = useState<number | null>(null);

//     const NFT_CONTRACT_ADDRESS = process.env.NFT_COLLECTION_ADDRESS as string;

//     const mintPack = useCallback(async (userId: string): Promise<MintedNFT> => {
//         setIsMinting(true);
//         setError(null);

//         try {
//             const sdk = getThirdwebSDK();
//             const nftCollection = await sdk.getContract(
//                 NFT_CONTRACT_ADDRESS,
//                 "nft-collection"
//             );

//             // Get random metadata from pool
//             const { data: metadata, error: poolError } = await supabase
//                 .from('user_nft_pool')
//                 .select('*')
//                 .limit(1)
//                 .order('random()')
//                 .single();

//             if (poolError) throw new Error(`Failed to fetch metadata: ${poolError.message}`);

//             const nftMetadata = {
//                 name: metadata.display_name,
//                 description: "User Avatar NFT",
//                 image: metadata.avatar_url,
//                 properties: {
//                     minted_at: new Date().toISOString(),
//                     source_metadata_id: metadata.id
//                 }
//             };

//             // Mint NFT
//             const transactionResult = await nftCollection.mintTo(userId, nftMetadata);

//             // Get the minted token ID from the transaction
//             const tokenId = transactionResult.id;

//             // Get the actual NFT data
//             const nft = await nftCollection.get(tokenId);

//             // Record minting in database
//             const { error: mintError } = await supabase
//                 .from('minted_user_nfts')
//                 .insert({
//                     token_id: tokenId.toString(),
//                     metadata_id: metadata.id,
//                     owner_id: userId
//                 });

//             if (mintError) throw new Error(`Failed to record minting: ${mintError.message}`);

//             // Update owned NFTs list
//             getUserNFTs(userId);

//             return {
//                 tokenId: tokenId.toString(),
//                 metadata: nftMetadata
//             };

//         } catch (error) {
//             const err = error as Error;
//             setError(err);
//             throw err;
//         } finally {
//             setIsMinting(false);
//         }
//     }, []);

//     const getUserNFTs = useCallback(async (userId: string) => {
//         setIsLoading(true);
//         try {
//             const { data: nfts, error } = await supabase
//                 .from('minted_user_nfts')
//                 .select(`
//                     *,
//                     metadata:user_nft_pool(*)
//                 `)
//                 .eq('owner_id', userId)
//                 .order('created_at', { ascending: false });

//             if (error) throw new Error(`Failed to fetch NFTs: ${error.message}`);

//             setOwnedNFTs(nfts || []);
//             return nfts;
//         } catch (error) {
//             const err = error as Error;
//             setError(err);
//             throw err;
//         } finally {
//             setIsLoading(false);
//         }
//     }, []);

//     const getAvailableCount = useCallback(async () => {
//         try {
//             const { count, error } = await supabase
//                 .from('user_nft_pool')
//                 .select('*', { count: 'exact', head: true });

//             if (error) throw new Error(`Failed to get count: ${error.message}`);

//             setAvailableCount(count);
//             return count;
//         } catch (error) {
//             const err = error as Error;
//             setError(err);
//             return null;
//         }
//     }, []);

//     return {
//         mintPack,
//         getUserNFTs,
//         getAvailableCount,
//         isMinting,
//         isLoading,
//         error,
//         ownedNFTs,
//         availableCount
//     };
// };
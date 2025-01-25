import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { getUserTransactions } from "@/queries/user";

import { TRANSACTIONS_QUERY_KEY } from '@/queries/user';

export function useGetUserTransactions() {
    const { user: privyUser, ready } = usePrivy();

    return useQuery({
        queryKey: [TRANSACTIONS_QUERY_KEY, privyUser?.id],
        queryFn: async ({ queryKey }) => {
            console.log("Query function executing for:", queryKey[1]);

            if (!privyUser?.id) {
                throw new Error("No authenticated user");
            }

            const transactionData = await getUserTransactions(privyUser.id);
            return transactionData;
        },
        enabled: Boolean(ready && privyUser?.id),
        staleTime: 300000, // 5 minutes
        gcTime: 3600000,  // 1 hour
    });
}
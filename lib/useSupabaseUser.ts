import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';

import type { PrivyUser } from '@/types/privy';

export const useSupabaseUser = () => {
    const { user } = usePrivy();
    const [supabaseUser, setSupabaseUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const initSupabaseUser = async (privyUser: PrivyUser | null) => {
        if (!privyUser) {
            setSupabaseUser(null);
            setIsLoading(false);
            return;
        }

        try {
            const emailAccount = privyUser.linked_accounts.find(account => account.type === 'email');
            const userEmail = emailAccount?.address;

            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select()
                .eq('privy_id', privyUser.id)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Error fetching user:', fetchError);
                return null;
            }

            if (!existingUser) {
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({
                        privy_id: privyUser.id,
                        email: userEmail,
                    })
                    .select()
                    .single();

                if (createError) {
                    if (createError.code === '23505') { // Duplicate key error code
                        // Fetch the existing user
                        const { data: existingUser, error: fetchError } = await supabase
                            .from('users')
                            .select()
                            .eq('privy_id', privyUser.id)
                            .single();

                        if (fetchError) {
                            console.error('Error fetching existing user after duplicate key:', fetchError);
                            return null;
                        }

                        return existingUser;
                    } else {
                        console.error('Error creating user:', createError);
                        return null;
                    }
                }
                return newUser;
            }

            return existingUser;
        } catch (error) {
            console.error('Error in initSupabaseUser');
        }
    };

    useEffect(() => {
        const syncUser = async () => {
            setIsLoading(true);
            const supabaseUserData = await initSupabaseUser(user as PrivyUser);
            setSupabaseUser(supabaseUserData);
            setIsLoading(false);
        };

        syncUser();
    }, [user]);

    return { supabaseUser, isLoading, initSupabaseUser };
};
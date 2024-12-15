// hooks/useUserSearch.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import debounce from 'lodash/debounce';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    privy_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
}

const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 10;
const MIN_SEARCH_LENGTH = 2;  // Only search when input is at least 2 characters
const DEBOUNCE_DELAY = 5000;   // Increased debounce delay to 500ms

export function useUserSearch() {
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searchHistory, setSearchHistory] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSearchHistory();
    }, []);

    const loadSearchHistory = async () => {
        try {
            const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
            if (history) {
                setSearchHistory(JSON.parse(history));
            }
        } catch (err) {
            setError('Failed to load search history');
        }
    };

    const addToHistory = async (user: User) => {
        try {
            const updatedHistory = [
                user,
                ...searchHistory.filter(item => item.privy_id !== user.privy_id)
            ].slice(0, MAX_HISTORY_ITEMS);

            setSearchHistory(updatedHistory);
            await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (err) {
            setError('Failed to update search history');
        }
    };

    const clearHistory = async () => {
        try {
            setSearchHistory([]);
            await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
        } catch (err) {
            setError('Failed to clear search history');
        }
    };

    const removeFromHistory = async (userId: string) => {
        try {
            const updatedHistory = searchHistory.filter(item => item.privy_id !== userId);
            setSearchHistory(updatedHistory);
            await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (err) {
            setError('Failed to remove from search history');
        }
    };

    const performSearch = async (searchTerm: string) => {
        // Don't search if term is too short
        if (!searchTerm.trim() || searchTerm.length < MIN_SEARCH_LENGTH) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: searchError } = await supabase
                .from('users')
                .select('privy_id, username, display_name, avatar_url')
                .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
                .limit(10);

            if (searchError) throw searchError;
            setSearchResults(data || []);
        } catch (err) {
            setError('Failed to search users');
        } finally {
            setLoading(false);
        }
    };

    const debouncedSearch = useRef(
        debounce(performSearch, DEBOUNCE_DELAY)
    ).current;

    const cleanup = useCallback(() => {
        debouncedSearch.cancel();
    }, [debouncedSearch]);

    return {
        searchResults,
        searchHistory,
        loading,
        error,
        searchUsers: debouncedSearch,
        addToHistory,
        removeFromHistory,
        clearHistory,
        cleanup
    };
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ltmquqidkjjnkatjlejs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0bXF1cWlka2pqbmthdGpsZWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NzQwODgsImV4cCI6MjA0ODE1MDA4OH0.1sNbmcX_GzU6mUDVxDeeQ8jA_cimvRv3N7sCLblFR88';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});


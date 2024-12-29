// runContext.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_RUN_ID_KEY = 'CURRENT_RUN_ID';

export const setCurrentRunId = async (runId: string) => {
    try {
        await AsyncStorage.setItem(CURRENT_RUN_ID_KEY, runId);
    } catch (error) {
        console.error('Error setting currentRunId:', error);
    }
};

export const getCurrentRunId = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(CURRENT_RUN_ID_KEY);
    } catch (error) {
        console.error('Error getting currentRunId:', error);
        return null;
    }
};

export const clearCurrentRunId = async () => {
    try {
        await AsyncStorage.removeItem(CURRENT_RUN_ID_KEY);
    } catch (error) {
        console.error('Error clearing currentRunId:', error);
    }
};

let currentRunId: string | null = null;

export const setCurrentRunId = (runId: string) => {
    currentRunId = runId;
};

export const getCurrentRunId = (): string | null => {
    return currentRunId;
};

export const clearCurrentRunId = () => {
    currentRunId = null;
};
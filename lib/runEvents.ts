// events/runEvents.ts
import EventEmitter from 'eventemitter3';

export interface RunCompletedEvent {
    runId: string;
    userId: string;
    distance_meters: number;
    duration_seconds: number;
    started_at: string;
    ended_at: string;
    title?: string;
}

export const runEvents = new EventEmitter();

export const RUN_EVENTS = {
    RUN_COMPLETED: 'RUN_COMPLETED',
    RUN_STARTED: 'RUN_STARTED',
    RUN_PAUSED: 'RUN_PAUSED',
    RUN_RESUMED: 'RUN_RESUMED'
} as const;

export type RunEventType = typeof RUN_EVENTS[keyof typeof RUN_EVENTS];
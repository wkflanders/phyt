// lib/runEvents.ts
import EventEmitter from 'eventemitter3';
import type { FeedPost } from '@/types/types';

export interface RunCompletedEvent {
    runId: string;
    userId: string;
    distance_meters: number;
    duration_seconds: number;
    started_at: string;
    ended_at: string;
    title?: string;
}

export interface PostCreatedEvent {
    post: FeedPost;
}

export interface CommentCreatedEvent {
    postId: string;
    comment: Comment;
}

export const runEvents = new EventEmitter();

export const RUN_EVENTS = {
    RUN_COMPLETED: 'RUN_COMPLETED',
    RUN_STARTED: 'RUN_STARTED',
    RUN_PAUSED: 'RUN_PAUSED',
    RUN_RESUMED: 'RUN_RESUMED',
    POST_CREATED: 'POST_CREATED',
    COMMENT_CREATED: 'COMMENT_CREATED'
} as const;

export type RunEventType = typeof RUN_EVENTS[keyof typeof RUN_EVENTS];
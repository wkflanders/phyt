import * as Location from 'expo-location';

export interface RunLocation {
    run_id: string;
    latitude: number;
    longitude: number;
    altitude: number | null;
    timestamp: number;
    speed: number | null;
}

export interface Run {
    id: string;
    user_id: string;
    started_at: string;
    ended_at?: string;
    status: 'in_progress' | 'completed';
    distance_meters?: number;
    duration_seconds?: number;
    average_speed?: number;
}

export interface LocationTaskOptions extends Location.LocationTaskOptions {
    runId?: string;
}

export interface User {
    privy_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
}

export interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user: User;
}

export interface Reaction {
    id: string;
    type: 'like' | 'love' | 'celebrate';
    user: User;
}

export interface FeedPost {
    id: string;
    content: string;
    created_at: string;
    user: User;
    run?: Run | null;
    // Change this to handle both count and array cases
    comments: Comment[] | { count: number; };
    reactions: {
        count: number;
        items?: Array<{
            id: string;
            type: 'like' | 'love' | 'celebrate';
            user: User;
        }>;
    };
}
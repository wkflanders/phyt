// Basic User Types
export interface User {
    privy_id: string;
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
}

// Profile Types
export interface Profile {
    privy_id: string;
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
}

export interface FollowStats {
    followers: number;
    following: number;
}

export interface ProfileData {
    profile: Profile;
    followStats: FollowStats;
    isFollowing: boolean;
}

// Run Types
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
    status: 'in_progress' | 'paused' | 'completed';
    distance_meters?: number;
    duration_seconds?: number;
    average_speed?: number;
    title?: string;
}

export interface RunStats {
    total_stats: {
        total_runs: number;
        total_distance: number;
        total_duration: number;
        average_speed: number;
        longest_run: number;
        fastest_pace: number;
    };
    weekly_stats: DailyActivity[];
    monthly_stats: MonthlyActivity[];
}

export interface DailyActivity {
    date: string;
    distance: number;
    duration: number;
    runs: number;
}

export interface MonthlyActivity {
    month: string;
    distance: number[];
}

export interface LocationTaskOptions {
    accuracy?: number;
    timeInterval?: number;
    distanceInterval?: number;
    showsBackgroundLocationIndicator?: boolean;
    activityType?: string;
    runId?: string;
}

// Post Types
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
    post_id: string;
    user_id: string;
    type: 'like' | 'love' | 'celebrate';
    created_at: string;
    user: User;
}

export interface FeedPost {
    id: string;
    content: string;
    created_at: string;
    user: User;
    run?: Run;
    comments: Comment[] | { count: number; };
    reactions: {
        count: number;
        items?: Reaction[];
    };
}

// Utility Types
export interface ErrorResponse {
    message: string;
    code?: string;
    status?: number;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    cursor?: string;
}
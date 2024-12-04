type EmailAccount = {
    type: 'email';
    address: string;
    first_verified_at: number;
    latest_verified_at: number;
};

type PrivyLinkedAccount = EmailAccount | {
    type: string;
    verified_at: number;
    first_verified_at: number | null;
    latest_verified_at: number | null;
    [key: string]: any;
};

export type PrivyUser = {
    id: string;
    created_at: number;
    linked_accounts: PrivyLinkedAccount[];
};
export type AnalyticsEvent = 'impression' | 'click' | 'read';
export type AnalyticsCategory = 'flipbook' | 'overlay' | 'page';

export type AnalyticsRead = {
    event_id: string;
    completed: number; // 0 or 1
    read_session_id: string;
    idempotency_key: Buffer; // raw Buffer bytes
    ms: number;
    seq: number;
    ts_ms: number;
    received_at: Date;
    id: string;
    session_id: string;
    started_at: Date;
    ended_at: Date | null;
    last_seen: Date;
    state: 'active' | 'closed' | string; // expand if you have more known states
    closed_reason: string | null;
    event_type: 'read' | string; // could add more event types if known
    flipbook_id: string;
    page_number: number;
    user_id: string | null;
    timestamp: Date;
}

export type AnalyticsClick = {
    event_id: string;
    click_type: 'external' | 'internal' | string; // adjust if you know all possible types
    href: string;
    overlay_id: string;
    id: string;
    event_type: 'click'
    flipbook_id: string;
    page_number: number;
    session_id: string;
    user_id: string | null;
    timestamp: string; // or Date if you parse it
}

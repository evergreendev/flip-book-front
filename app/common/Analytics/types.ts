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

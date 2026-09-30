'use server'

export async function getFlipbookReadCounts(ids: string[]): Promise<Record<string, number>> {
    const counts = await Promise.all(ids.map(async id => {
        try {
            const response = await fetch(`${process.env.BACKEND_URL}/analytics/events/read/${encodeURIComponent(id)}`, {cache: 'no-store'});
            if (!response.ok) return [id, 0] as const;
            const reads = await response.json();
            return [id, Object.keys(reads).length] as const;
        } catch {
            return [id, 0] as const;
        }
    }));
    return Object.fromEntries(counts);
}

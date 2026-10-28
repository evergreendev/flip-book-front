export const PAGE_TURN_DURATION = 700;

export function visiblePages(page: number, total: number, single: boolean): number[] {
    if (page < 1 || page > total) return [];
    if (single || page === 1 || (page === total && total % 2 === 0)) return [page];
    const right = page % 2 === 0 ? page + 1 : page;
    return [right - 1, right].filter(value => value <= total);
}

export function adjacentPage(page: number, total: number, single: boolean, direction: -1 | 1) {
    if (single) return Math.max(1, Math.min(total, page + direction));
    const spread = visiblePages(page, total, false);
    if (!spread.length) return 1;
    if (direction === 1) return Math.min(total, spread[spread.length - 1] + 2);
    return Math.max(1, spread[0] - 1);
}

export function pageTurn(thisPage: number, previous: number, current: number, total: number, single: boolean) {
    const before = visiblePages(previous, total, single);
    const after = visiblePages(current, total, single);
    const forward = current > previous;
    const wasVisible = before.includes(thisPage);
    const isVisible = after.includes(thisPage);
    const outgoing = thisPage === (forward ? before[before.length - 1] : before[0]);
    const incoming = thisPage === (forward ? after[0] : after[after.length - 1]);
    const moving = previous !== current && wasVisible !== isVisible && (outgoing || incoming);
    return {
        wasVisible,
        isVisible,
        moving,
        from: moving && !wasVisible ? (forward ? 180 : -180) : 0,
        to: moving && !isVisible ? (forward ? -180 : 180) : 0,
    };
}

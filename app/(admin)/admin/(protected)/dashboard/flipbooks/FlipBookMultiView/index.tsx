"use client"

import {useEffect, useRef, useState} from "react";
import {FlipBook} from "@/app/types";
import FlipBookAdminView from "./FlipBookAdminView";
import {getFlipbookReadCounts} from "../actions/readCounts";

const sortFields = ['id', 'pdf_path', 'path_name', 'status', 'password', 'title', 'cover_path', 'published_at', 'created_at', 'updated_at'];

export default function FlipBookMultiView({coverBaseUrl}: {coverBaseUrl: string}) {
    const [options, setOptions] = useState({limit: 20, showDrafts: true, orderBy: 'created_at', orderDirection: 'DESC'});
    const [requestedPage, setRequestedPage] = useState(1);
    const [page, setPage] = useState(1);
    const [flipBooks, setFlipBooks] = useState<FlipBook[]>([]);
    const [readCounts, setReadCounts] = useState<Record<string, number>>({});
    const [hasNext, setHasNext] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);
    const requestId = useRef(0);
    const displayedPage = useRef(1);
    const currentOptions = useRef(options);

    function changeOptions(next: typeof options) {
        requestId.current++;
        setOptions(next);
        setRequestedPage(1);
        setPage(1);
        displayedPage.current = 1;
        setFlipBooks([]);
        setHasNext(false);
        setLoading(true);
    }

    useEffect(() => {
        const id = ++requestId.current;
        const controller = new AbortController();
        const optionsChanged = currentOptions.current !== options;
        currentOptions.current = options;
        setLoading(true);
        setError(null);

        async function load() {
            try {
                const query = new URLSearchParams({page: String(requestedPage), limit: String(options.limit), orderBy: options.orderBy, orderDirection: options.orderDirection});
                if (options.showDrafts) query.set('showDrafts', 'true');
                const response = await fetch(`/api/flipbooks?${query}`, {credentials: 'include', cache: 'no-store', signal: controller.signal});
                const data: unknown = await response.json();
                const emptyPage = response.status === 404 && Array.isArray(data) && data.length === 0;
                if (!response.ok && !emptyPage) throw new Error('Unable to load flipbooks. Please try again.');
                if (!Array.isArray(data)) throw new Error('The server returned an invalid flipbook listing.');
                if (id !== requestId.current || controller.signal.aborted) return;
                if (data.length === 0 && requestedPage > displayedPage.current && !optionsChanged) {
                    setHasNext(false);
                    return;
                }
                const records = data as FlipBook[];
                setFlipBooks(records.map(row => ({...row, title: row.title || 'Unnamed Flipbook'})));
                setReadCounts({});
                setPage(requestedPage);
                displayedPage.current = requestedPage;
                setHasNext(records.length === options.limit);
                // Analytics counts should not block pagination or turn a successful listing into an error.
                void getFlipbookReadCounts(records.map(row => row.id)).then(counts => {
                    if (id === requestId.current && !controller.signal.aborted) setReadCounts(counts);
                }).catch(() => {});
            } catch (err) {
                if (id === requestId.current && !controller.signal.aborted) {
                    setError(err instanceof Error ? err.message : 'Unable to load flipbooks. Please try again.');
                }
            } finally {
                if (id === requestId.current && !controller.signal.aborted) setLoading(false);
            }
        }
        void load();
        return () => {
            controller.abort();

        };
    }, [requestedPage, options, retry]);

    function navigate(nextPage: number) {
        requestId.current++;
        setLoading(true);
        setRequestedPage(nextPage);
        setRetry(value => value + 1);
    }

    return <div>
        <div className="flex flex-wrap items-center gap-4 mb-4">
            <label>Per page <select value={options.limit} onChange={event => changeOptions({...options, limit: Number(event.target.value)})} className="border rounded p-2">
                {[20, 50, 100].map(limit => <option key={limit} value={limit}>{limit}</option>)}
            </select></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={options.showDrafts} onChange={event => changeOptions({...options, showDrafts: event.target.checked})}/>Include drafts</label>
            <label>Sort by <select value={options.orderBy} onChange={event => changeOptions({...options, orderBy: event.target.value})} className="border rounded p-2">
                {sortFields.map(field => <option key={field} value={field}>{field.replaceAll('_', ' ')}</option>)}
            </select></label>
            <label>Direction <select value={options.orderDirection} onChange={event => changeOptions({...options, orderDirection: event.target.value})} className="border rounded p-2">
                <option value="DESC">Descending</option><option value="ASC">Ascending</option>
            </select></label>
        </div>
        {error && <div role="alert" className="text-red-700 mb-4">{error} <button className="underline" disabled={loading} onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
        {loading && <p role="status" className="mb-4">Loading flipbooks…</p>}
        <div aria-busy={loading} className="grid grid-cols-1">
            {flipBooks.map(flipBook => <FlipBookAdminView key={flipBook.id} flipBook={flipBook} coverBaseUrl={coverBaseUrl} readCount={readCounts[flipBook.id] || 0}/>)}
            {!loading && !error && flipBooks.length === 0 && <p>No flipbooks found.</p>}
        </div>
        <nav aria-label="Flipbook pagination" className="flex items-center justify-center gap-4 mt-4">
            <button className="border rounded px-3 py-2 disabled:opacity-50" disabled={loading || page === 1} onClick={() => navigate(page - 1)}>Previous</button>
            <span aria-live="polite">Page {page}</span>
            <button className="border rounded px-3 py-2 disabled:opacity-50" disabled={loading || !hasNext} onClick={() => navigate(page + 1)}>Next</button>
        </nav>
    </div>;
}


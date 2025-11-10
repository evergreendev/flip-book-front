import Header from "@/app/(admin)/admin/(protected)/components/Header";
import {AnalyticsRead} from "@/app/common/Analytics/types";
import {formatDuration, intervalToDuration} from "date-fns";

// Simple stub page for per‑flipbook analytics
// Sections included:
// - Flipbook impressions
// - Overlay impressions
// - Overlay clicks
// - Average read time per flipbook
// - Average read time per page

type Args = {
    params: Promise<{
        id?: string;
    }>;
};

const getReadsByFlipbookId = async (flipbookId: string): Promise<Response> => {

    return await fetch(`${process.env.BACKEND_URL}/analytics/events/read/${flipbookId}`, {})
}

const getClicksByFlipbookId = async (flipbookId: string): Promise<Response> => {
    return await fetch(`${process.env.BACKEND_URL}/analytics/events/click/${flipbookId}`, {})
}

const getImpressionsByFlipbookId = async (flipbookId: string): Promise<Response> => {
    return await fetch(`${process.env.BACKEND_URL}/analytics/events/impression/${flipbookId}`, {})
}

function averageReadTimeByGroup(
    grouped: Record<string, AnalyticsRead[]>
): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [key, events] of Object.entries(grouped)) {
        const total = events.reduce((sum, e) => sum + e.ms, 0);
        result[key] = events.length ? total / events.length : 0;
    }

    return result;
}

export default async function AnalyticsPage({params: paramsPromise}: Args) {
    const {id = ""} = await paramsPromise;

    const reads = await getReadsByFlipbookId(id);
    const readsData: Record<string, AnalyticsRead[]> = await reads.json();

    const averageReadTimeByGrouped = averageReadTimeByGroup(readsData);
    const averageReadTimeArray = Object.values(averageReadTimeByGrouped);
    const flipBookAverageReadTime = (averageReadTimeArray.reduce((a, b) => a + b, 0) / averageReadTimeArray.length);


    const impressions = await getImpressionsByFlipbookId(id);
    const impressionsData = await impressions.json();
    const flipbookImpressions = impressionsData.filter((e: { [x: string]: string; }) => {
        return e["impression_type"] === "flipbook"
    });

    const clicks = await getClicksByFlipbookId(id);
    const clicksData = await clicks.json();
    const allClicks = Object.values(clicksData).flat();

    return (
        <>
            <Header/>
            <div className="container mx-auto py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p className="text-gray-600">Flipbook ID: <span className="font-mono">{id}</span></p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                    {/* Flipbook impressions */}
                    <section className="border p-4 bg-white">
                        <h2 className="text-lg font-semibold mb-2">Flipbook impressions</h2>
                        <div className="text-gray-500">{flipbookImpressions.length}</div>
                    </section>

                    {/* Reads */}
                    <section className="border p-4 bg-white">
                        <h2 className="text-lg font-semibold mb-2">Reads</h2>
                        <div className="text-gray-500">{Object.keys(readsData).length}</div>
                    </section>

                    {/* Overlay clicks */}
                    <section className="border p-4 bg-white">
                        <h2 className="text-lg font-semibold mb-2">Clicks</h2>
                        <div className="text-gray-500">{allClicks.length}</div>
                    </section>

                    {/* Average read time per flipbook */}
                    <section className="border p-4 bg-white">
                        <h2 className="text-lg font-semibold mb-2">Average read time</h2>
                        <div className="text-gray-500">
                            {formatDuration(
                                intervalToDuration({
                                    start: 0,
                                    end: Math.round(flipBookAverageReadTime / 1000) * 1000
                                }),
                                {format: ['hours', 'minutes', 'seconds']}
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

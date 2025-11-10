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

    return (
        <>
            <Header/>
            <div className="container mx-auto py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p className="text-gray-600">Flipbook ID: <span className="font-mono">{id}</span></p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Flipbook impressions */}
                    <section className="border rounded-lg p-4 bg-white">
                        <h2 className="text-lg font-semibold mb-2">Flipbook impressions</h2>
                        <div className="text-gray-500">Coming soon</div>
                    </section>

                    {/* Overlay impressions */}
                    <section className="border rounded-lg p-4 bg-white">
                        <h2 className="text-lg font-semibold mb-2">Overlay impressions</h2>
                        <div className="text-gray-500">Coming soon</div>
                    </section>

                    {/* Overlay clicks */}
                    <section className="border rounded-lg p-4 bg-white">
                        <h2 className="text-lg font-semibold mb-2">Overlay clicks</h2>
                        <div className="text-gray-500">Coming soon</div>
                    </section>

                    {/* Average read time per flipbook */}
                    <section className="border rounded-lg p-4 bg-white">
                        <h2 className="text-lg font-semibold mb-2">Average read time (flipbook)</h2>
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

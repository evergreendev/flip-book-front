import FlipBookMultiView from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/FlipBookMultiView";
import Header from "@/app/(admin)/admin/(protected)/components/Header";

export default function FlipbooksPage() {
    return <>
        <Header/>
        <div className="container mx-auto py-10">
            <FlipBookMultiView coverBaseUrl={process.env.PDF_URL || ''}/>
        </div>
    </>;
}

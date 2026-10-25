import Loader from "../components/ui/loader";

export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <Loader title="Loading page..." subtitle="Please wait while the page loads" />
    </main>
  );
}

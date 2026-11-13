"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-content">
      <h1>Something went wrong</h1>
      <p>Please try again, or contact Garden Bistro at +250 786 458 663.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

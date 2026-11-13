import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page-content">
      <span className="eyebrow">GARDEN BISTRO</span>
      <h1>Page not found</h1>
      <Link className="button" href="/en">
        Return home
      </Link>
    </main>
  );
}

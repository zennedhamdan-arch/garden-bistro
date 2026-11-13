import "./globals.css";
import { headers } from "next/headers";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await headers()).get("x-garden-locale") ?? "en";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}

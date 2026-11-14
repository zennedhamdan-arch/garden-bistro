import "@fontsource-variable/newsreader";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { headers } from "next/headers";
export const metadata = { icons: { icon: "/images/garden-bistro-logo.png", apple: "/images/garden-bistro-logo.png" } };
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

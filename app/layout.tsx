import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://localshop-ai.loyal-bell-2663.chatgpt.site"),
  title: "LocalShop AI",
  description:
    "An agentic commerce workspace that turns natural-language product questions into confirmation-gated checkouts.",
  openGraph: {
    title: "LocalShop AI",
    description: "Find better. Buy confidently.",
    images: [{ url: "/og.png", width: 1731, height: 909 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LocalShop AI",
    description: "Find better. Buy confidently.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

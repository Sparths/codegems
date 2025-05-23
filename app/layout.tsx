// app/layout.tsx - Updated version
import "./globals.css";
import type { Metadata } from "next";
import { SavedProvider } from "./saved/SavedContext";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/next";
import DiscordPromo from "@/components/DiscordPromo";
import ProjectUpdaterWorker from "@/components/ProjectUpdaterWorker";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Code Gems - Discover Remarkable GitHub Projects",
  description:
    "Welcome to Code Gems - a community-driven platform for discovering and sharing remarkable GitHub projects! Explore amazing open-source projects curated by developers, designers, and tech enthusiasts.",
  keywords: [
    "github",
    "projects",
    "code",
    "gems",
    "programming",
    "open-source",
    "developer tools",
  ],
  authors: [{ name: "Bebedi" }],
  creator: "Code Gems",
  publisher: "Bebedi",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: "https://codegems.xyz",
    title: "Code Gems - Discover Remarkable GitHub Projects",
    description:
      "Explore and share amazing open-source projects on Code Gems, a community-driven platform for developers, designers, and tech enthusiasts.",
    siteName: "Code Gems",
    images: [
      {
        url: "https://codegems.xyz/icon.png",
        width: 1200,
        height: 630,
        alt: "Code Gems - Discover Remarkable GitHub Projects",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the CSP nonce from headers
  const headersList = await headers();
  const nonce = headersList.get('X-CSP-Nonce') || undefined;

  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://codegems.xyz" />
        {nonce && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.__CSP_NONCE__ = '${nonce}';`
            }}
          />
        )}
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <SavedProvider>{children}</SavedProvider>
          <DiscordPromo />
          <Footer />
          <Toaster />
          <Analytics />
          <SpeedInsights />
          {/* Add the background worker component */}
          <ProjectUpdaterWorker />
        </AuthProvider>
      </body>
    </html>
  );
}
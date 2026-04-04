import type { Metadata } from "next";
import { Bebas_Neue, Space_Mono, Inter } from "next/font/google";
import "@/app/globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NETRA — AI-Powered Autonomous Drone Response for Urban Safety",
  description:
    "India's AI Eye in the Sky. Real-time incident detection, autonomous drone dispatch, " +
    "and live command center visualization for urban safety.",
  keywords: ["drone", "urban safety", "AI", "India", "smart city", "NETRA"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${spaceMono.variable} ${inter.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-void text-signal antialiased">
        {children}
      </body>
    </html>
  );
}

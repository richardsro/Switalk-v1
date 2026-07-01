import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Inter variable (latin subset), vendored so builds never fetch fonts.
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Switalk — one inbox for every conversation",
  description:
    "Unified inbox, social auto-poster and CRM for solopreneurs. One app instead of four, under £20/month.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./style.css";

const brandFontsCss = process.env.BELL_BRAND_FONTS_CSS_URL?.startsWith("https://")
  ? process.env.BELL_BRAND_FONTS_CSS_URL
  : undefined;

export const metadata: Metadata = {
  title: "Bell | The stack for building personal assistant agents",
  description:
    "Bell is a personal assistant agent built on Browserbase, eve, Linq and Stripe Link. Ask, browse, verify.",
  icons: { icon: "/bell.png", apple: "/bell.png" },
};

export const viewport: Viewport = {
  themeColor: "#f3f5f8",
  colorScheme: "light",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {brandFontsCss ? (
        <head>
          {/* Licensed brand fonts are hosted privately and never committed; see .env.example. */}
          <link rel="stylesheet" href={brandFontsCss} crossOrigin="anonymous" />
        </head>
      ) : null}
      <body>{children}</body>
    </html>
  );
}

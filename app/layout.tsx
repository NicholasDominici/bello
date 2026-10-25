import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./style.css";

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
      <body>{children}</body>
    </html>
  );
}

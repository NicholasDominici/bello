import type { ReactNode } from "react";
import "./style.css";

export const metadata = {
  title: "BELLO | Orbit personal assistant",
  description: "The personal assistant stack with Orbit. Ask, browse, and verify in one workspace.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

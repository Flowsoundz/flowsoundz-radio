import type { ReactNode } from "react";
import "../globals.css";

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="bg-transparent m-0 p-0">{children}</body>
    </html>
  );
}

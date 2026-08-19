import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Super Bazar",
  description: "Full-width marketplace shopping with cart and checkout.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

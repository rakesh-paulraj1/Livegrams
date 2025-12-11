import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../utils/Provider";


export const metadata: Metadata = {
  title: "Livegrams",
  description: "Create Diagrams with AI and Colaborate with peers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
      <body >
        {children}
      </body>
      </Providers>
    </html>
  );
}

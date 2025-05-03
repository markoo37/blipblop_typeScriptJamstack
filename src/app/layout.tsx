// src/app/layout.tsx
import { IdleLogoutGuard } from "@/components/IdleLogoutGuard";
import Navbar from "@/components/Navbar";
import type { Metadata } from "next";
import "./globals.css";
import { SWRConfig } from "swr";


export const metadata: Metadata = {
  title: "blipblop",
  description: "Teljesen TypeScript alapú Jamstack videómegosztó",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SWRConfig
          value={{
            // Futtasson újra lekérést mountkor és fókuszváltáskor
            revalidateOnMount: true,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            // Tartsuk meg az órás deduplikációt
            dedupingInterval: 1000 * 60 * 60,
          }}
        >
          <IdleLogoutGuard>
            <Navbar />
            {children}
          </IdleLogoutGuard>
        </SWRConfig>
      </body>
    </html>
  );
}

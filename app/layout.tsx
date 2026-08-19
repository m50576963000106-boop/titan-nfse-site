import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "TITAN NFS-e — Emissão Padrão Nacional";
  const description = "Emissor TITAN NFS-e integrado ao ambiente oficial de Produção Restrita.";

  return {
    metadataBase,
    title,
    description,
    // O manifest e os ícones abaixo são o que permite instalar o portal na tela
    // inicial e, mais adiante, empacotá-lo como app Android (TWA).
    manifest: "/manifest.webmanifest",
    applicationName: "TITAN NFS-e",
    appleWebApp: { capable: true, title: "TITAN NFS-e", statusBarStyle: "black-translucent" },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/icons/apple-touch-icon.png",
    },
    openGraph: {
      title,
      description,
      images: [{ url: "/og-onboarding.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-onboarding.png"],
    },
  };
}

export const viewport = {
  themeColor: "#0b1629",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

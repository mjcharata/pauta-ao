import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const base = host ? `${protocol}://${host}` : undefined;

  return {
    title: "Pauta AO — Pauta Aduaneira de Angola 2024",
    description: "Pesquisa de códigos pautais, direitos de importação e classificação assistida de listas de produtos.",
    metadataBase: base ? new URL(base) : undefined,
    icons: { icon: "/favicon.png", shortcut: "/favicon.png" },
    openGraph: {
      title: "Pauta AO — Encontre o código certo",
      description: "A Pauta Aduaneira de Angola, pesquisável e pronta para o seu trabalho.",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pauta AO — pesquisa pautal para Angola" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Pauta AO — Encontre o código certo",
      description: "Pesquisa e classificação pautal para Angola.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-AO"><body>{children}</body></html>;
}

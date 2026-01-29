import "./globals.css";
import { Inter } from "next/font/google";
import InstallPrompt from "@/components/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

// Configuração correta para limpar o aviso de 'themeColor' no console
export const viewport = {
  themeColor: "#0f172a",
};

export const metadata = {
  title: "YOP DEVS | Sistema de Elite",
  description: "Onde o Código Elite encontra o Capital Estratégico.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YOP DEVS",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" className="antialiased">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-[#fcfcfd] text-[#0f172a]`}>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
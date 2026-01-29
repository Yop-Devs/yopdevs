import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "YOP DEVS | Conectando Código e Capital",
  description: "A plataforma definitiva para desenvolvedores e fundadores.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" className="antialiased">
      <body className={`${inter.className} bg-[#fcfcfd] text-[#0f172a]`}>
        {children}
      </body>
    </html>
  );
}
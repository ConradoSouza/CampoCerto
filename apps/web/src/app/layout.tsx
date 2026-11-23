import type { Metadata } from "next";
import { Archivo, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const titulo = Archivo({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--fonte-titulo" });
const texto = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--fonte-texto" });

export const metadata: Metadata = {
  title: { default: "Campo Certo", template: "%s · Campo Certo" },
  description: "Gestão do campo: fazendas, talhões, safras, ordens de serviço e estoque.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable}`}>
      <body>{children}</body>
    </html>
  );
}

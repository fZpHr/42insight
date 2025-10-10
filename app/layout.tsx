import "./globals.css";
import Providers from "./providers";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "42 Insight",
    template: "%s | 42 Insight",
  },
  description: "One for all - Website for 42 Students",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} `}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
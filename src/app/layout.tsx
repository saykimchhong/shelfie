import type { Metadata, Viewport } from "next";
import { Noto_Sans_Khmer, Noto_Sans_Sinhala, Noto_Sans_Tamil, Noto_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { site } from "@/lib/site";
import "@/styles/globals.scss";

// Latin UI font + script fonts for product labels. Script fonts aren't preloaded:
// the browser only fetches them when a Khmer / Sinhala / Tamil / Thai glyph appears.
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const khmer = Noto_Sans_Khmer({ subsets: ["khmer"], variable: "--font-khmer", display: "swap", preload: false });
const thai = Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-thai", display: "swap", preload: false });
const sinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], variable: "--font-sinhala", display: "swap", preload: false });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} · ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#17110e" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${khmer.variable} ${sinhala.variable} ${tamil.variable} ${thai.variable}`}
    >
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}

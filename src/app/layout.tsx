import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Yimday",
    template: "%s | Yimday",
  },
  description:
    "ระบบจัดการโพยและผลรางวัลของ Yimday สำหรับใช้งานบนมือถือและเดสก์ท็อป",
  applicationName: "Yimday",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yimday",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/pwa/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#155eef",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full w-full flex flex-col">{children}</body>
    </html>
  );
}

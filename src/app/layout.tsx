import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#161718" },
  ],
};

export const metadata: Metadata = {
  title: { default: "Homeroom", template: "%s · Homeroom" },
  description: "A student portal for classes, announcements, calendar, grades, and to-dos.",
};

// Runs before paint: if no theme cookie was set, follow the system preference.
const themeScript = `(function(){try{var h=document.documentElement;if(!h.getAttribute('data-theme')){h.setAttribute('data-theme',window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const theme = store.get("theme")?.value;
  const dataTheme = theme === "dark" || theme === "light" ? theme : undefined;

  return (
    <html
      lang="en"
      data-theme={dataTheme}
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <div id="app" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}

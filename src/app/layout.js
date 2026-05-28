import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "../components/AuthProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "IPMS - Indoor Pollution Monitoring System",
  description:
    "Real-time indoor air quality monitoring dashboard. Track temperature, humidity, and pollution levels from your ESP32 sensor.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}

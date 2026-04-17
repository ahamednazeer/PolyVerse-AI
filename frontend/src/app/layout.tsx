import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "sonner";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "PolyVerse AI — Multi-Agent Intelligence",
    description: "Multi-Agent Intelligence Platform powered by Groq. Chat with specialized AI agents for teaching, coding, vision analysis, and more.",
};

export const viewport: Viewport = {
    themeColor: "#0f172a",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${inter.variable} font-sans antialiased`}
            >
                {children}
                <Toaster
                    theme="dark"
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            fontFamily: "'Inter', sans-serif",
                        },
                    }}
                />
            </body>
        </html>
    );
}

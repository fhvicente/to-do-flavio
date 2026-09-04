import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

export const metadata: Metadata = {
	title: "To-Do",
	description: "A simple task manager with a REST API",
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={geist.variable} lang="pt-PT">
			<body className="min-h-dvh bg-neutral-50 font-sans text-neutral-900 antialiased">
				{children}
			</body>
		</html>
	);
}

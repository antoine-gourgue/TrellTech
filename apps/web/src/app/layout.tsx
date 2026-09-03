import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeScript } from '@/components/theme-script';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const title = 'TrellTech — vos tableaux, au propre';
const description =
  'Organisez vos projets en tableaux, documents et whiteboards. Un espace de travail soigné, avec synchronisation Trello.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: 'TrellTech',
  openGraph: {
    type: 'website',
    siteName: 'TrellTech',
    title,
    description,
    url: siteUrl,
    locale: 'fr_FR',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'TrellTech — vos tableaux, au propre' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e12' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

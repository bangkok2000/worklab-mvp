import './styles/globals.css';
import { AuthProvider } from '@/lib/auth';
import VersionCheck from './components/VersionCheck';

export const metadata = {
  title: 'MoonScribe - Document Intelligence Platform',
  description: 'AI-powered document analysis with BYOK (Bring Your Own Key) support',
  // Prevent caching of HTML
  other: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌙</text></svg>"
        />
      </head>
      <body>
        <VersionCheck />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

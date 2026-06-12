import './globals.css';

export const metadata = {
  title: 'Alquiler de Andamios',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Andamios', statusBarStyle: 'default' },
  icons: {
    icon: '/icono-192.png',
    apple: '/icono-192.png'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1d4ed8'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

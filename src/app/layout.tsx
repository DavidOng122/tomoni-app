import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata = {
  title: 'Tomoni',
  description: 'Tomoni App',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // "不得禁用页面缩放" -> no maximum-scale or user-scalable=no
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}

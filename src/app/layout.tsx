import './globals.css'

export const metadata = {
  title: 'Tomoni',
  description: 'Tomoni App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

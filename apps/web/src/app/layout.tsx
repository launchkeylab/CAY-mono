import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CAY - Safety Timer',
  description: 'Personal safety timer application',
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
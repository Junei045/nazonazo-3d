import type { Metadata } from 'next'
// Cloudscape global styles: Open Sans font + the system's typography/color baseline.
// This import must happen once, at the application root.
import '@cloudscape-design/global-styles/index.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'なぞなぞ 3D クイズ',
  description:
    '3D キャラクターが音声と文字でなぞなぞを出題し、文字で回答する 3D Web ゲームです。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

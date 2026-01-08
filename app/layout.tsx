export const metadata = {
  title: 'MoonScribe - Document Intelligence Platform',
  description: 'Upload PDFs and ask questions with BYOK (Bring Your Own Key)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}

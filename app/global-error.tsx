'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '40px', textAlign: 'center', color: '#fff', background: '#1a2e1a', minHeight: '100vh' }}>
          <h2 style={{ color: '#ff6b6b' }}>Etwas ist schiefgelaufen</h2>
          <button onClick={() => reset()} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  )
}

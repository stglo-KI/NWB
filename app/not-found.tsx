import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ color: '#FFD700', fontSize: '1.5rem', marginBottom: '10px' }}>Seite nicht gefunden</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>Die angeforderte Seite existiert nicht.</p>
      <Link href="/dashboard" style={{ color: '#FFD700', textDecoration: 'underline' }}>
        Zurück zum Dashboard
      </Link>
    </div>
  )
}

import Link from 'next/link'
import { LogIn, Settings } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', marginTop: '20px', padding: '0 20px' }}>
        <div></div>
        <Link href="/admin" style={{ textDecoration: 'none' }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} /> Admin
          </button>
        </Link>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ marginBottom: '20px' }}>
          <img 
            src="/images/Nahwarme Logo-final_weiss-806e5840.webp" 
            alt="Nahwärme Logo" 
            style={{ maxWidth: '200px', height: 'auto' }}
          />
        </div>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          background: 'linear-gradient(90deg, #FFD700, #DAA520, #228B22)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px'
        }}>
          Nahwärme Verbrauchsportal
        </h1>
        <p style={{ color: '#aaa', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Ihr persönliches Kundenportal zur Verwaltung Ihres Nahwärmeverbrauchs.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <Link href="/auth/login" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' }}>
            <LogIn size={48} style={{ color: '#FFD700', marginBottom: '15px' }} />
            <h2 style={{ color: '#FFD700', marginBottom: '10px' }}>Kundenportal</h2>
            <p style={{ color: '#aaa' }}>Anmeldung für Kunden</p>
          </div>
        </Link>
      </div>

      <footer style={{ 
        textAlign: 'center', 
        marginTop: '80px', 
        padding: '20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        color: '#666'
      }}>
        <p>© 2024 Nahwärme Verbrauchsportal</p>
      </footer>
    </div>
  )
}

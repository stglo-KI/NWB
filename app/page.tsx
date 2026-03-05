import Link from 'next/link'
import { Home, Gauge, Receipt, User, LogIn } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '40px', marginTop: '60px' }}>
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
        <p style={{ color: '#aaa', fontSize: '1rem' }}>
          Willkommen bei Ihrem Nahwärme-Verbrauchsmanagement
        </p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <Link href="/auth/login" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}>
            <LogIn size={48} style={{ color: '#FFD700', marginBottom: '15px' }} />
            <h2 style={{ color: '#FFD700', marginBottom: '10px' }}>Anmelden</h2>
            <p style={{ color: '#aaa' }}>Zum Kundenportal anmelden</p>
          </div>
        </Link>

        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}>
            <Gauge size={48} style={{ color: '#FFD700', marginBottom: '15px' }} />
            <h2 style={{ color: '#FFD700', marginBottom: '10px' }}>Verbrauch</h2>
            <p style={{ color: '#aaa' }}>Zählerstände erfassen und Verbrauch anzeigen</p>
          </div>
        </Link>

        <Link href="/installments" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}>
            <Receipt size={48} style={{ color: '#FFD700', marginBottom: '15px' }} />
            <h2 style={{ color: '#FFD700', marginBottom: '10px' }}>Abschläge</h2>
            <p style={{ color: '#aaa' }}>Monatliche Abschläge verwalten</p>
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

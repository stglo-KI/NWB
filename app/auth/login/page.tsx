'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Ungültige Anmeldedaten')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img 
            src="/images/Nahwarme Logo-final_weiss-806e5840.webp" 
            alt="Logo" 
            style={{ maxWidth: '150px', marginBottom: '20px' }}
          />
          <h1 style={{ color: '#FFD700', fontSize: '1.8rem' }}>Anmelden</h1>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ 
                padding: '12px', 
                background: 'rgba(220,53,69,0.2)', 
                border: '1px solid #dc3545',
                borderRadius: '8px',
                color: '#ff6b6b',
                marginBottom: '20px'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>E-Mail</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ihre@email.de"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Passwort</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Anmeldung...' : 'Anmelden'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', color: '#aaa' }}>
            Noch kein Konto?{' '}
            <Link href="/auth/register" style={{ color: '#FFD700' }}>Registrieren</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

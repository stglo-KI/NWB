'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    address: '',
    objectName: '',
    customerNumber: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registrierung fehlgeschlagen')
        setLoading(false)
        return
      }

      router.push('/auth/login?registered=true')
    } catch {
      setError('Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="container" style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img 
            src="/images/Nahwarme Logo-final_weiss-806e5840.webp" 
            alt="Logo" 
            style={{ maxWidth: '150px', marginBottom: '20px' }}
          />
          <h1 style={{ color: '#FFD700', fontSize: '1.8rem' }}>Registrieren</h1>
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

            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Vorname *</label>
                  <input name="firstName" className="input-field" onChange={handleChange} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Nachname *</label>
                  <input name="lastName" className="input-field" onChange={handleChange} required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>E-Mail *</label>
                <input name="email" type="email" className="input-field" onChange={handleChange} required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Passwort *</label>
                <input name="password" type="password" className="input-field" onChange={handleChange} required minLength={6} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Adresse *</label>
                <input name="address" className="input-field" onChange={handleChange} required placeholder="Straße, Hausnummer, PLZ Ort" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Objekt/ Anschluss</label>
                <input name="objectName" className="input-field" onChange={handleChange} placeholder="z.B. Wohnung 1" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>Kundennummer</label>
                <input name="customerNumber" className="input-field" onChange={handleChange} />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? 'Registrierung...' : 'Registrieren'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', color: '#aaa' }}>
            Bereits ein Konto?{' '}
            <Link href="/auth/login" style={{ color: '#FFD700' }}>Anmelden</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

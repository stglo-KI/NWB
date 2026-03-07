'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LogOut, Gauge, Receipt, Lock } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  gender: string
  firstName: string
  lastName: string
  street: string
  postalCode: string
  city: string
  phone: string
  objectName: string | null
  customerNumber: string | null
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [formData, setFormData] = useState<Profile>({
    gender: '',
    firstName: '',
    lastName: '',
    street: '',
    postalCode: '',
    city: '',
    phone: '',
    objectName: '',
    customerNumber: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json()
      if (data) {
        setProfile(data)
        setFormData(data)
      }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      setProfile(formData)
      setEditing(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('Die neuen Passwörter stimmen nicht überein')
      return
    }

    if (passwordData.new.length < 6) {
      setPasswordError('Das Passwort muss mindestens 6 Zeichen haben')
      return
    }

    const res = await fetch('/api/users/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      }),
    })

    if (res.ok) {
      setPasswordSuccess('Passwort erfolgreich geändert!')
      setPasswordData({ current: '', new: '', confirm: '' })
      setShowPasswordForm(false)
    } else {
      const data = await res.json()
      setPasswordError(data.error || 'Fehler beim Ändern des Passworts')
    }
  }

  if (loading) return <div className="container">Laden...</div>

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px 0' }}>
        <div>
          <h1 style={{ color: '#FFD700', fontSize: '1.8rem' }}>Profil</h1>
          <p style={{ color: '#aaa' }}>Ihre Kontodaten</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard" className="btn btn-secondary">
            <Gauge size={18} style={{ marginRight: '8px' }} /> Verbrauch
          </Link>
          <Link href="/installments" className="btn btn-secondary">
            <Receipt size={18} style={{ marginRight: '8px' }} /> Abschläge
          </Link>
          {session?.user?.role === 'ADMIN' && (
            <Link href="/admin" className="btn btn-secondary">Admin</Link>
          )}
          <button onClick={() => signOut()} className="btn btn-secondary">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#90EE90' }}>Kundendaten</h2>
          {!editing ? (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>Bearbeiten</button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleSave}>Speichern</button>
              <button className="btn btn-secondary" onClick={() => { setEditing(false); setFormData(profile!) }}>Abbrechen</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Anrede</label>
              {editing ? (
                <select className="input-field" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                  <option value="">Bitte wählen</option>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                </select>
              ) : (
                <div style={{ color: '#e8e8e8' }}>{profile?.gender || '-'}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Vorname</label>
              {editing ? (
                <input className="input-field" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              ) : (
                <div style={{ color: '#e8e8e8' }}>{profile?.firstName}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Nachname</label>
              {editing ? (
                <input className="input-field" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              ) : (
                <div style={{ color: '#e8e8e8' }}>{profile?.lastName}</div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>E-Mail</label>
            <div style={{ color: '#e8e8e8' }}>{session?.user?.email}</div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Telefon</label>
            {editing ? (
              <input className="input-field" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Telefonnummer" />
            ) : (
              <div style={{ color: '#e8e8e8' }}>{profile?.phone || '-'}</div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Straße</label>
            {editing ? (
              <input className="input-field" value={formData.street} onChange={(e) => setFormData({...formData, street: e.target.value})} />
            ) : (
              <div style={{ color: '#e8e8e8' }}>{profile?.street}</div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>PLZ</label>
              {editing ? (
                <input className="input-field" value={formData.postalCode} onChange={(e) => setFormData({...formData, postalCode: e.target.value})} />
              ) : (
                <div style={{ color: '#e8e8e8' }}>{profile?.postalCode}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Ort</label>
              {editing ? (
                <input className="input-field" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              ) : (
                <div style={{ color: '#e8e8e8' }}>{profile?.city}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Objekt</label>
              <div style={{ color: '#e8e8e8' }}>{profile?.objectName || '-'}</div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Kundennummer</label>
              <div style={{ color: '#e8e8e8' }}>{profile?.customerNumber || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#90EE90' }}>Passwort ändern</h2>
          {!showPasswordForm && (
            <button className="btn btn-secondary" onClick={() => setShowPasswordForm(true)}>
              <Lock size={18} style={{ marginRight: '8px' }} /> Passwort ändern
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '20px', 
            borderRadius: '12px'
          }}>
            {passwordError && <div style={{ color: '#ff6b6b', marginBottom: '15px' }}>{passwordError}</div>}
            {passwordSuccess && <div style={{ color: '#90EE90', marginBottom: '15px' }}>{passwordSuccess}</div>}
            
            <div style={{ display: 'grid', gap: '15px', maxWidth: '400px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Aktuelles Passwort</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Neues Passwort</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Neues Passwort bestätigen</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Passwort ändern</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordForm(false)}>Abbrechen</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

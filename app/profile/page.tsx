'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LogOut, Gauge, Receipt, User } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  firstName: string
  lastName: string
  address: string
  objectName: string | null
  customerNumber: string | null
  connectionId: string | null
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Profile>({
    firstName: '',
    lastName: '',
    address: '',
    objectName: '',
    customerNumber: '',
    connectionId: '',
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

      <div className="card">
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
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
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Adresse</label>
            {editing ? (
              <input className="input-field" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            ) : (
              <div style={{ color: '#e8e8e8' }}>{profile?.address}</div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Objekt</label>
              {editing ? (
                <input className="input-field" value={formData.objectName || ''} onChange={(e) => setFormData({...formData, objectName: e.target.value})} />
              ) : (
                <div style={{ color: '#e8e8e8' }}>{profile?.objectName || '-'}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Kundennummer</label>
              {editing ? (
                <input className="input-field" value={formData.customerNumber || ''} onChange={(e) => setFormData({...formData, customerNumber: e.target.value})} />
              ) : (
                <div style={{ color: '#e8e8e8' }}>{profile?.customerNumber || '-'}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

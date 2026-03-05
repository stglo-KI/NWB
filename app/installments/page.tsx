'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { LogOut, User, Plus, Trash2, Gauge, Home } from 'lucide-react'
import Link from 'next/link'

interface Installment {
  id: string
  amount: number
  validFrom: string
  validTo: string | null
}

export default function InstallmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newInstallment, setNewInstallment] = useState({ amount: '', validFrom: '' })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      fetchInstallments()
    }
  }, [status, router])

  const fetchInstallments = async () => {
    const res = await fetch('/api/installments')
    const data = await res.json()
    setInstallments(data)
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/installments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(newInstallment.amount),
        validFrom: newInstallment.validFrom,
      }),
    })

    if (res.ok) {
      setShowForm(false)
      setNewInstallment({ amount: '', validFrom: '' })
      fetchInstallments()
    }
  }

  const currentInstallment = installments.find(i => !i.validTo)

  if (loading) return <div className="container">Laden...</div>

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px 0' }}>
        <div>
          <h1 style={{ color: '#FFD700', fontSize: '1.8rem' }}>Abschläge</h1>
          <p style={{ color: '#aaa' }}>Monatliche Abschlagszahlungen verwalten</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard" className="btn btn-secondary">
            <Gauge size={18} style={{ marginRight: '8px' }} /> Verbrauch
          </Link>
          <Link href="/profile" className="btn btn-secondary">
            <User size={18} style={{ marginRight: '8px' }} /> Profil
          </Link>
          {session?.user?.role === 'ADMIN' && (
            <Link href="/admin" className="btn btn-secondary">Admin</Link>
          )}
          <button onClick={() => signOut()} className="btn btn-secondary">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {currentInstallment && (
        <div className="card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, rgba(34,139,34,0.3), rgba(34,139,34,0.1))' }}>
          <h2 style={{ color: '#90EE90', marginBottom: '15px' }}>Aktueller Abschlag</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#FFD700' }}>
              {currentInstallment.amount.toLocaleString()}
            </span>
            <span style={{ color: '#aaa', fontSize: '1.2rem' }}>€ / Monat</span>
          </div>
          <p style={{ color: '#aaa', marginTop: '10px' }}>
            Gültig ab {format(new Date(currentInstallment.validFrom), 'dd.MM.yyyy', { locale: de })}
          </p>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#90EE90' }}>Abschlags-Historie</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} style={{ marginRight: '8px' }} /> Neuer Abschlag
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '20px', 
            borderRadius: '12px', 
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Betrag (€)</label>
              <input 
                type="number" 
                step="0.01"
                className="input-field"
                value={newInstallment.amount}
                onChange={(e) => setNewInstallment({ ...newInstallment, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Gültig ab</label>
              <input 
                type="date" 
                className="input-field"
                value={newInstallment.validFrom}
                onChange={(e) => setNewInstallment({ ...newInstallment, validFrom: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">Speichern</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Abbrechen</button>
            </div>
          </form>
        )}

        <table>
          <thead>
            <tr>
              <th>Gültig ab</th>
              <th>Gültig bis</th>
              <th>Betrag</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {installments.map(inst => (
              <tr key={inst.id}>
                <td>{format(new Date(inst.validFrom), 'dd.MM.yyyy')}</td>
                <td>{inst.validTo ? format(new Date(inst.validTo), 'dd.MM.yyyy') : '-'}</td>
                <td style={{ color: '#FFD700', fontWeight: 'bold' }}>{inst.amount.toLocaleString()} €</td>
                <td>
                  {!inst.validTo && <span className="badge badge-success">Aktiv</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { de } from 'date-fns/locale'
import { LogOut, User, Plus, Trash2, Gauge, Receipt } from 'lucide-react'
import Link from 'next/link'

interface MeterEntry {
  id: string
  date: string
  value: number
  entryType: string
  comment: string | null
  consumption: number | null
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [entries, setEntries] = useState<MeterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newEntry, setNewEntry] = useState({ date: '', value: '', comment: '' })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      fetchEntries()
    }
  }, [status, router])

  const fetchEntries = async () => {
    const res = await fetch('/api/meter-entries')
    const data = await res.json()
    setEntries(data)
    setLoading(false)
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/meter-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: newEntry.date,
        value: parseFloat(newEntry.value),
        entryType: 'METER_READING',
        comment: newEntry.comment || null,
      }),
    })

    if (res.ok) {
      setShowForm(false)
      setNewEntry({ date: '', value: '', comment: '' })
      fetchEntries()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return
    await fetch(`/api/meter-entries?id=${id}`, { method: 'DELETE' })
    fetchEntries()
  }

  const chartData = entries.slice(0, 12).reverse().map(entry => ({
    month: format(new Date(entry.date), 'MMM yy', { locale: de }),
    verbrauch: entry.consumption || 0,
    stand: entry.value,
  }))

  const yearlyTotal = entries.reduce((sum, e) => sum + (e.consumption || 0), 0)
  const lastEntry = entries[0]

  if (loading) return <div className="container">Laden...</div>

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px 0' }}>
        <div>
          <h1 style={{ color: '#FFD700', fontSize: '1.8rem' }}>Verbrauch</h1>
          <p style={{ color: '#aaa' }}>Willkommen, {session?.user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/installments" className="btn btn-secondary">
            <Receipt size={18} style={{ marginRight: '8px' }} /> Abschläge
          </Link>
          <Link href="/profile" className="btn btn-secondary">
            <User size={18} style={{ marginRight: '8px' }} /> Profil
          </Link>
          {session?.user?.role === 'ADMIN' && (
            <Link href="/admin" className="btn btn-secondary">
              Admin
            </Link>
          )}
          <button onClick={() => signOut()} className="btn btn-secondary">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <Gauge size={32} style={{ color: '#FFD700', marginBottom: '10px' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFD700' }}>
            {lastEntry?.value.toLocaleString() || 0}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Aktueller Zählerstand</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#228B22' }}>
            {yearlyTotal.toLocaleString()}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Verbrauch laufendes Jahr (kWh)</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#DAA520' }}>
            {entries.length}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Einträge gesamt</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#FFD700', marginBottom: '20px' }}>Verbrauchsentwicklung</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip 
                contentStyle={{ background: '#1a2e1a', border: '1px solid #FFD700' }}
                labelStyle={{ color: '#FFD700' }}
              />
              <Bar dataKey="verbrauch" fill="#228B22" name="Verbrauch (kWh)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#90EE90' }}>Zählerstände</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} style={{ marginRight: '8px' }} /> Neu erfassen
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddEntry} style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '20px', 
            borderRadius: '12px', 
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Datum</label>
              <input 
                type="date" 
                className="input-field"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Zählerstand (kWh)</label>
              <input 
                type="number" 
                step="0.01"
                className="input-field"
                value={newEntry.value}
                onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Kommentar</label>
              <input 
                type="text" 
                className="input-field"
                value={newEntry.comment}
                onChange={(e) => setNewEntry({ ...newEntry, comment: e.target.value })}
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
              <th>Datum</th>
              <th>Zählerstand</th>
              <th>Verbrauch</th>
              <th>Kommentar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td>{format(new Date(entry.date), 'dd.MM.yyyy')}</td>
                <td style={{ color: '#FFD700', fontWeight: 'bold' }}>{entry.value.toLocaleString()} kWh</td>
                <td style={{ color: entry.consumption && entry.consumption > 0 ? '#DAA520' : '#aaa' }}>
                  {entry.consumption ? `${entry.consumption.toLocaleString()} kWh` : '-'}
                </td>
                <td style={{ color: '#aaa' }}>{entry.comment || '-'}</td>
                <td>
                  <button 
                    onClick={() => handleDelete(entry.id)}
                    style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { format, subMonths, subYears, startOfMonth, getMonth, getYear } from 'date-fns'
import { de } from 'date-fns/locale'
import { LogOut, User, Plus, Trash2, Gauge, Receipt, Download } from 'lucide-react'
import Link from 'next/link'

interface MeterEntry {
  id: string
  date: string
  value: number
  entryType: string
  comment: string | null
  consumption: number | null
}

interface Installment {
  id: string
  amount: number
  validFrom: string
}

interface Tariff {
  id: string
  name: string
  validFrom: string
  energyPrice: number
  basePrice: number
}

interface Invoice {
  id: string
  createdAt: string
  billingPeriod: { name: string }
}

interface ChartEvent {
  x: string
  label: string
  color: string
}

const EVENT_COLORS = {
  installment: '#87CEEB',
  tariff: '#FF69B4',
  invoice: '#FFA500',
}

const ChartLegend = () => (
  <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '10px', fontSize: '0.8rem' }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: '20px', height: '2px', background: EVENT_COLORS.installment, display: 'inline-block', borderTop: '2px dashed ' + EVENT_COLORS.installment }} />
      <span style={{ color: EVENT_COLORS.installment }}>Abschlag</span>
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: '20px', height: '2px', background: EVENT_COLORS.tariff, display: 'inline-block', borderTop: '2px dashed ' + EVENT_COLORS.tariff }} />
      <span style={{ color: EVENT_COLORS.tariff }}>Tarifänderung</span>
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: '20px', height: '2px', background: EVENT_COLORS.invoice, display: 'inline-block', borderTop: '2px dashed ' + EVENT_COLORS.invoice }} />
      <span style={{ color: EVENT_COLORS.invoice }}>Abrechnung</span>
    </span>
  </div>
)

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [entries, setEntries] = useState<MeterEntry[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newEntry, setNewEntry] = useState({ date: '', value: '', comment: '' })
  const [entryError, setEntryError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    const [entriesRes, installmentsRes, tariffsRes, invoicesRes] = await Promise.all([
      fetch('/api/meter-entries'),
      fetch('/api/installments'),
      fetch('/api/tariffs'),
      fetch('/api/invoices'),
    ])
    setEntries(await entriesRes.json())
    setInstallments(await installmentsRes.json())
    setTariffs(await tariffsRes.json())
    setInvoices(await invoicesRes.json())
    setLoading(false)
  }

  const fetchEntries = async () => {
    const res = await fetch('/api/meter-entries')
    const data = await res.json()
    setEntries(data)
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setEntryError('')
    const res = await fetch('/api/meter-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: newEntry.date,
        value: parseFloat(newEntry.value),
        entryType: 'METER_READING',
        comment: newEntry.comment || undefined,
      }),
    })

    if (res.ok) {
      setShowForm(false)
      setNewEntry({ date: '', value: '', comment: '' })
      fetchEntries()
    } else {
      const data = await res.json()
      setEntryError(data.error || 'Fehler beim Speichern')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return
    await fetch(`/api/meter-entries?id=${id}`, { method: 'DELETE' })
    fetchEntries()
  }

  const getLast12MonthsData = () => {
    const now = new Date()
    const months: { [key: string]: number } = {}
    
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i)
      const key = format(date, 'yyyy-MM')
      months[key] = 0
    }

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      const entryDate = new Date(entry.date)
      const key = format(entryDate, 'yyyy-MM')

      if (months[key] !== undefined && entry.consumption) {
        months[key] += entry.consumption
      }
    }

    return Object.entries(months).map(([month, value]) => ({
      month: format(new Date(month + '-01'), 'MMM yy', { locale: de }),
      verbrauch: Math.round(value * 10) / 10,
    }))
  }

  const getLast10YearsData = () => {
    const now = new Date()
    const years: { [key: string]: number } = {}
    
    for (let i = 9; i >= 0; i--) {
      const year = now.getFullYear() - i
      years[year.toString()] = 0
    }

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      const entryYear = getYear(new Date(entry.date)).toString()

      if (years[entryYear] !== undefined && entry.consumption) {
        years[entryYear] += entry.consumption
      }
    }

    return Object.entries(years).map(([year, value]) => ({
      year: year,
      verbrauch: Math.round(value * 10) / 10,
    }))
  }

  const getMonthlyEvents = (data: { month: string }[]): ChartEvent[] => {
    const xValues = new Set(data.map(d => d.month))
    const events: ChartEvent[] = []
    installments.forEach(inst => {
      const x = format(new Date(inst.validFrom), 'MMM yy', { locale: de })
      if (xValues.has(x)) events.push({ x, label: `${inst.amount}€/M`, color: EVENT_COLORS.installment })
    })
    tariffs.forEach(t => {
      const x = format(new Date(t.validFrom), 'MMM yy', { locale: de })
      if (xValues.has(x)) events.push({ x, label: `${t.energyPrice}€/kWh`, color: EVENT_COLORS.tariff })
    })
    invoices.forEach(inv => {
      const x = format(new Date(inv.createdAt), 'MMM yy', { locale: de })
      if (xValues.has(x)) events.push({ x, label: 'Abr.', color: EVENT_COLORS.invoice })
    })
    return events
  }

  const getYearlyEvents = (data: { year: string }[]): ChartEvent[] => {
    const xValues = new Set(data.map(d => d.year))
    const events: ChartEvent[] = []
    installments.forEach(inst => {
      const x = getYear(new Date(inst.validFrom)).toString()
      if (xValues.has(x)) events.push({ x, label: `${inst.amount}€/M`, color: EVENT_COLORS.installment })
    })
    tariffs.forEach(t => {
      const x = getYear(new Date(t.validFrom)).toString()
      if (xValues.has(x)) events.push({ x, label: `${t.energyPrice}€/kWh`, color: EVENT_COLORS.tariff })
    })
    invoices.forEach(inv => {
      const x = getYear(new Date(inv.createdAt)).toString()
      if (xValues.has(x)) events.push({ x, label: 'Abr.', color: EVENT_COLORS.invoice })
    })
    return events
  }

  const monthlyData = getLast12MonthsData()
  const yearlyData = getLast10YearsData()
  const monthlyEvents = getMonthlyEvents(monthlyData)
  const yearlyEvents = getYearlyEvents(yearlyData)

  const yearlyTotal = entries.reduce((sum, e) => sum + (e.consumption || 0), 0)
  const lastEntry = entries[0]

  const tooltipStyle = {
    contentStyle: { background: '#1a2e1a', border: '1px solid #FFD700', borderRadius: '8px' },
    labelStyle: { color: '#FFD700' },
  }

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
          <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Verbrauch gesamt (kWh)</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#DAA520' }}>
            {entries.length}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Einträge gesamt</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#FFD700', marginBottom: '20px' }}>Verbrauch letzte 12 Monate</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#aaa" tick={{ fontSize: 12 }} />
              <YAxis stroke="#aaa" tick={{ fontSize: 12 }} />
              <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} kWh`, 'Verbrauch']} />
              {monthlyEvents.map((evt, i) => (
                <ReferenceLine key={`me-${i}`} x={evt.x} stroke={evt.color} strokeDasharray="5 5" label={{ value: evt.label, position: 'top', fill: evt.color, fontSize: 9 }} />
              ))}
              <Line
                type="monotone"
                dataKey="verbrauch"
                stroke="#FFD700"
                strokeWidth={2}
                dot={{ fill: '#FFD700', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#FFD700' }}
                name="Verbrauch (kWh)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend />
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#FFD700', marginBottom: '20px' }}>Verbrauch letzte 10 Jahre</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="year" stroke="#aaa" tick={{ fontSize: 12 }} />
              <YAxis stroke="#aaa" tick={{ fontSize: 12 }} />
              <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} kWh`, 'Verbrauch']} />
              {yearlyEvents.map((evt, i) => (
                <ReferenceLine key={`ye-${i}`} x={evt.x} stroke={evt.color} strokeDasharray="5 5" label={{ value: evt.label, position: 'top', fill: evt.color, fontSize: 9 }} />
              ))}
              <Line
                type="monotone"
                dataKey="verbrauch"
                stroke="#228B22"
                strokeWidth={2}
                dot={{ fill: '#228B22', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#228B22' }}
                name="Verbrauch (kWh)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#90EE90' }}>Zählerstände</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => {
              const csv = [
                'Datum;Zählerstand (kWh);Verbrauch (kWh);Kommentar',
                ...entries.map(e =>
                  `${format(new Date(e.date), 'dd.MM.yyyy')};${e.value};${e.consumption != null ? e.consumption : ''};${e.comment || ''}`
                )
              ].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `verbrauch_${format(new Date(), 'yyyy-MM-dd')}.csv`
              a.click()
            }}>
              <Download size={18} style={{ marginRight: '8px' }} /> CSV Export
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={18} style={{ marginRight: '8px' }} /> Neu erfassen
            </button>
          </div>
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
            {entryError && <div style={{ gridColumn: '1 / -1', color: '#ff6b6b', marginBottom: '10px' }}>{entryError}</div>}
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

'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { 
  LogOut, Users, FileText, Euro, Settings, Plus, Trash2, 
  Lock, Unlock, Download, Play, CheckCircle 
} from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  email: string
  role: string
  status: string
  profile: {
    firstName: string
    lastName: string
    address: string
    customerNumber: string | null
  }
}

interface BillingPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  invoices: any[]
  controlReadings: any[]
}

interface Tariff {
  id: string
  name: string
  validFrom: string
  validTo: string | null
  energyPrice: number
  basePrice: number
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState<UserData[]>([])
  const [periods, setPeriods] = useState<BillingPeriod[]>([])
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(true)
  const [showPeriodForm, setShowPeriodForm] = useState(false)
  const [showTariffForm, setShowTariffForm] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    } else if (status === 'authenticated') {
      loadData()
    }
  }, [status, router, session])

  const loadData = async () => {
    const [usersRes, periodsRes, tariffsRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/billing'),
      fetch('/api/tariffs'),
    ])
    setUsers(await usersRes.json())
    setPeriods(await periodsRes.json())
    setTariffs(await tariffsRes.json())
    setLoading(false)
  }

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, data }),
    })
    loadData()
  }

  const createPeriod = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await fetch('/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
      }),
    })
    setShowPeriodForm(false)
    loadData()
  }

  const createTariff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await fetch('/api/tariffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        validFrom: formData.get('validFrom'),
        energyPrice: parseFloat(formData.get('energyPrice') as string),
        basePrice: parseFloat(formData.get('basePrice') as string) || 0,
      }),
    })
    setShowTariffForm(false)
    loadData()
  }

  const runBilling = async (periodId: string) => {
    await fetch('/api/billing/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billingPeriodId: periodId }),
    })
    loadData()
  }

  const exportCSV = async (periodId: string) => {
    const res = await fetch(`/api/admin/invoices?billingPeriodId=${periodId}`)
    const invoices = await res.json()
    
    const csv = [
      'Kunde;Adresse;Verbrauch (kWh);Energiekosten;Grundkosten;Gesamtkosten;Abschläge;Saldo',
      ...invoices.map((inv: any) => 
        `${inv.user.profile?.firstName} ${inv.user.profile?.lastName};${inv.user.profile?.address};${inv.consumption};${inv.energyCosts};${inv.baseCosts};${inv.totalCosts};${inv.installmentsSum};${inv.balance}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `abrechnung_${periodId}.csv`
    a.click()
  }

  if (loading) return <div className="container">Laden...</div>

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px 0' }}>
        <div>
          <h1 style={{ color: '#FFD700', fontSize: '1.8rem' }}>Verwaltung</h1>
          <p style={{ color: '#aaa' }}>Administrator-Bereich</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard" className="btn btn-secondary">
            <Users size={18} style={{ marginRight: '8px' }} /> Zurück
          </Link>
          <button onClick={() => signOut()} className="btn btn-secondary">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        {[
          { id: 'users', label: 'Benutzer', icon: Users },
          { id: 'billing', label: 'Abrechnung', icon: FileText },
          { id: 'tariffs', label: 'Tarife', icon: Euro },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
          >
            <tab.icon size={18} style={{ marginRight: '8px' }} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="card">
          <h2 style={{ color: '#90EE90', marginBottom: '20px' }}>Benutzerverwaltung</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Adresse</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.profile?.firstName} {user.profile?.lastName}</td>
                  <td>{user.email}</td>
                  <td style={{ fontSize: '0.85rem' }}>{user.profile?.address}</td>
                  <td>
                    <span className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {user.status === 'ACTIVE' ? (
                        <button onClick={() => handleUserAction(user.id, 'lock')} title="Sperren" style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>
                          <Lock size={16} />
                        </button>
                      ) : (
                        <button onClick={() => handleUserAction(user.id, 'unlock')} title="Entsperren" style={{ background: 'none', border: 'none', color: '#90EE90', cursor: 'pointer' }}>
                          <Unlock size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'billing' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#90EE90' }}>Abrechnungsperioden</h2>
              <button className="btn btn-primary" onClick={() => setShowPeriodForm(!showPeriodForm)}>
                <Plus size={18} style={{ marginRight: '8px' }} /> Neue Periode
              </button>
            </div>

            {showPeriodForm && (
              <form onSubmit={createPeriod} style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '20px', 
                borderRadius: '12px', 
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Name</label>
                  <input name="name" className="input-field" required placeholder="z.B. 2024" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Start</label>
                  <input name="startDate" type="date" className="input-field" required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Ende</label>
                  <input name="endDate" type="date" className="input-field" required />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">Erstellen</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPeriodForm(false)}>Abbrechen</button>
                </div>
              </form>
            )}

            {periods.map(period => (
              <div key={period.id} style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '20px', 
                borderRadius: '12px', 
                marginBottom: '15px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ color: '#FFD700' }}>{period.name}</h3>
                    <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                      {format(new Date(period.startDate), 'dd.MM.yyyy')} - {format(new Date(period.endDate), 'dd.MM.yyyy')}
                    </p>
                  </div>
                  <span className={`badge ${period.status === 'COMPLETED' ? 'badge-success' : period.status === 'RUNNING' ? 'badge-warning' : 'badge-danger'}`}>
                    {period.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {period.status === 'DRAFT' && (
                    <button className="btn btn-primary" onClick={() => handlePeriodAction(period.id, 'start')}>
                      <Play size={16} style={{ marginRight: '5px' }} /> Starten
                    </button>
                  )}
                  {period.status === 'RUNNING' && (
                    <>
                      <button className="btn btn-primary" onClick={() => runBilling(period.id)}>
                        <CheckCircle size={16} style={{ marginRight: '5px' }} /> Abrechnung erstellen
                      </button>
                      <button className="btn btn-secondary" onClick={() => exportCSV(period.id)}>
                        <Download size={16} style={{ marginRight: '5px' }} /> CSV Export
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tariffs' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#90EE90' }}>Tarife</h2>
            <button className="btn btn-primary" onClick={() => setShowTariffForm(!showTariffForm)}>
              <Plus size={18} style={{ marginRight: '8px' }} /> Neuer Tarif
            </button>
          </div>

          {showTariffForm && (
            <form onSubmit={createTariff} style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Name</label>
                <input name="name" className="input-field" required placeholder="z.B. Standard" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Gültig ab</label>
                <input name="validFrom" type="date" className="input-field" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Arbeitspreis (€/kWh)</label>
                <input name="energyPrice" type="number" step="0.001" className="input-field" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Grundpreis (€/Jahr)</label>
                <input name="basePrice" type="number" step="0.01" className="input-field" />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">Erstellen</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTariffForm(false)}>Abbrechen</button>
              </div>
            </form>
          )}

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Gültig ab</th>
                <th>Gültig bis</th>
                <th>Arbeitspreis</th>
                <th>Grundpreis</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map(tariff => (
                <tr key={tariff.id}>
                  <td>{tariff.name}</td>
                  <td>{format(new Date(tariff.validFrom), 'dd.MM.yyyy')}</td>
                  <td>{tariff.validTo ? format(new Date(tariff.validTo), 'dd.MM.yyyy') : 'unbegrenzt'}</td>
                  <td style={{ color: '#FFD700' }}>{tariff.energyPrice.toFixed(3)} €/kWh</td>
                  <td>{tariff.basePrice.toFixed(2)} €/Jahr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

async function handlePeriodAction(periodId: string, action: string) {
  await fetch('/api/billing', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, billingPeriodId: periodId }),
  })
}

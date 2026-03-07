'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, subMonths, getYear } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  LogOut, Users, FileText, Euro, Plus, Lock, Unlock, Download, Play, CheckCircle, Edit, X, Gauge, Trash2
} from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  profile: {
    gender: string
    firstName: string
    lastName: string
    street: string
    postalCode: string
    city: string
    phone: string
    customerNumber: string | null
    objectName: string | null
  }
}

interface BillingPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

interface Tariff {
  id: string
  name: string
  validFrom: string
  validTo: string | null
  energyPrice: number
  basePrice: number
}

interface MeterEntryData {
  id: string
  date: string
  value: number
  entryType: string
  comment: string | null
  consumption: number | null
}

interface InstallmentData {
  id: string
  amount: number
  validFrom: string
}

interface InvoiceData {
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
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [installmentUser, setInstallmentUser] = useState<UserData | null>(null)
  const [newInstallment, setNewInstallment] = useState({ amount: '', validFrom: '' })
  const [meterUser, setMeterUser] = useState<UserData | null>(null)
  const [meterEntries, setMeterEntries] = useState<MeterEntryData[]>([])
  const [newMeterEntry, setNewMeterEntry] = useState({ date: '', value: '', comment: '' })
  const [editingMeterEntry, setEditingMeterEntry] = useState<{ id: string, date: string, value: string, comment: string } | null>(null)
  const [meterUserInstallments, setMeterUserInstallments] = useState<InstallmentData[]>([])
  const [meterUserInvoices, setMeterUserInvoices] = useState<InvoiceData[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const generateCustomerNumber = () => {
    const year = new Date().getFullYear()
    const count = users.filter(u => u.role === 'USER').length + 1
    return `KU-${year}-${String(count).padStart(3, '0')}`
  }

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, data }),
    })
    loadData()
  }

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    const formData = new FormData(e.currentTarget)
    const customerNumber = formData.get('customerNumber') as string || generateCustomerNumber()
    
    const userData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      gender: formData.get('gender') as string,
      street: formData.get('street') as string,
      postalCode: formData.get('postalCode') as string,
      city: formData.get('city') as string,
      phone: formData.get('phone') as string,
      objectName: formData.get('objectName') as string || undefined,
      customerNumber: customerNumber,
    }

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })

    if (res.ok) {
      setSuccess('Kunde erfolgreich erstellt!')
      setShowUserForm(false)
      loadData()
    } else {
      const data = await res.json()
      setError(data.error || 'Fehler beim Erstellen')
    }
  }

  const updateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingUser) return
    
    setError('')
    setSuccess('')
    
    const formData = new FormData(e.currentTarget)
    
    const userData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      gender: formData.get('gender') as string,
      street: formData.get('street') as string,
      postalCode: formData.get('postalCode') as string,
      city: formData.get('city') as string,
      phone: formData.get('phone') as string,
      objectName: formData.get('objectName') as string || undefined,
      customerNumber: formData.get('customerNumber') as string || undefined,
    }

    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: editingUser.id, 
        action: 'updateProfile', 
        data: userData 
      }),
    })

    if (res.ok) {
      setSuccess('Kunde erfolgreich aktualisiert!')
      setEditingUser(null)
      loadData()
    } else {
      const data = await res.json()
      setError(data.error || 'Fehler beim Aktualisieren')
    }
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

  const createInstallment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!installmentUser) return
    setError('')
    setSuccess('')

    const res = await fetch('/api/installments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: installmentUser.id,
        amount: parseFloat(newInstallment.amount),
        validFrom: newInstallment.validFrom,
      }),
    })

    if (res.ok) {
      setSuccess(`Abschlag für ${installmentUser.profile?.firstName} ${installmentUser.profile?.lastName} erfolgreich erstellt!`)
      setInstallmentUser(null)
      setNewInstallment({ amount: '', validFrom: '' })
    } else {
      const data = await res.json()
      setError(data.error || 'Fehler beim Erstellen des Abschlags')
    }
  }

  const loadMeterEntries = async (userId: string) => {
    const [entriesRes, installmentsRes, invoicesRes] = await Promise.all([
      fetch(`/api/admin/meter-entries?userId=${userId}`),
      fetch(`/api/installments?userId=${userId}`),
      fetch(`/api/admin/invoices?userId=${userId}`),
    ])
    if (entriesRes.ok) setMeterEntries(await entriesRes.json())
    if (installmentsRes.ok) setMeterUserInstallments(await installmentsRes.json())
    if (invoicesRes.ok) setMeterUserInvoices(await invoicesRes.json())
  }

  const openMeterDialog = (user: UserData) => {
    setMeterUser(user)
    setEditingUser(null)
    setInstallmentUser(null)
    setShowUserForm(false)
    setError('')
    setSuccess('')
    setNewMeterEntry({ date: '', value: '', comment: '' })
    setEditingMeterEntry(null)
    loadMeterEntries(user.id)
  }

  const createMeterEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meterUser) return
    setError('')
    setSuccess('')

    const res = await fetch('/api/admin/meter-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: meterUser.id,
        date: newMeterEntry.date,
        value: parseFloat(newMeterEntry.value),
        comment: newMeterEntry.comment || undefined,
      }),
    })

    if (res.ok) {
      setSuccess('Zählerstand erfolgreich erfasst!')
      setNewMeterEntry({ date: '', value: '', comment: '' })
      loadMeterEntries(meterUser.id)
    } else {
      const data = await res.json()
      setError(data.error || 'Fehler beim Erfassen')
    }
  }

  const updateMeterEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meterUser || !editingMeterEntry) return
    setError('')
    setSuccess('')

    const res = await fetch('/api/admin/meter-entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingMeterEntry.id,
        date: editingMeterEntry.date,
        value: parseFloat(editingMeterEntry.value),
        comment: editingMeterEntry.comment || undefined,
      }),
    })

    if (res.ok) {
      setSuccess('Zählerstand erfolgreich aktualisiert!')
      setEditingMeterEntry(null)
      loadMeterEntries(meterUser.id)
    } else {
      const data = await res.json()
      setError(data.error || 'Fehler beim Aktualisieren')
    }
  }

  const deleteMeterEntry = async (entryId: string) => {
    if (!meterUser) return
    if (!confirm('Zählerstand wirklich löschen?')) return

    const res = await fetch(`/api/admin/meter-entries?id=${entryId}`, { method: 'DELETE' })
    if (res.ok) {
      loadMeterEntries(meterUser.id)
    } else {
      const data = await res.json()
      setError(data.error || 'Fehler beim Löschen')
    }
  }

  const handlePeriodAction = async (periodId: string, action: string) => {
    await fetch('/api/billing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, billingPeriodId: periodId }),
    })
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

  const exportUsersCSV = () => {
    const csv = [
      'Anrede;Vorname;Nachname;Straße;PLZ;Ort;Telefon;E-Mail;Objekt;Kundennummer;Status;Erstellt',
      ...users.filter(u => u.role === 'USER').map(u => 
        `${u.profile?.gender || ''};${u.profile?.firstName || ''};${u.profile?.lastName || ''};${u.profile?.street || ''};${u.profile?.postalCode || ''};${u.profile?.city || ''};${u.profile?.phone || ''};${u.email};${u.profile?.objectName || ''};${u.profile?.customerNumber || ''};${u.status};${format(new Date(u.createdAt), 'dd.MM.yyyy')}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kunden_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const exportBillingCSV = async (periodId: string) => {
    const res = await fetch(`/api/admin/invoices?billingPeriodId=${periodId}`)
    const invoices = await res.json()
    
    const csv = [
      'Kunde;Adresse;Verbrauch (kWh);Energiekosten;Grundkosten;Gesamtkosten;Abschläge;Saldo',
      ...invoices.map((inv: any) =>
        `${inv.user.profile?.firstName} ${inv.user.profile?.lastName};${inv.user.profile?.street || ''} ${inv.user.profile?.postalCode || ''} ${inv.user.profile?.city || ''};${inv.consumption};${inv.energyCosts?.toFixed(2)};${inv.baseCosts?.toFixed(2)};${inv.totalCosts?.toFixed(2)};${inv.installmentsSum?.toFixed(2)};${inv.balance?.toFixed(2)}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `abrechnung_${periodId}.csv`
    a.click()
  }

  const UserForm = ({ user, onSubmit, onCancel }: { user?: UserData | null, onSubmit: (e: React.FormEvent<HTMLFormElement>) => void, onCancel: () => void }) => (
    <form onSubmit={onSubmit} style={{ 
      background: 'rgba(0,0,0,0.3)', 
      padding: '20px', 
      borderRadius: '12px', 
      marginBottom: '20px'
    }}>
      {error && <div style={{ color: '#ff6b6b', marginBottom: '15px' }}>{error}</div>}
      {success && <div style={{ color: '#90EE90', marginBottom: '15px' }}>{success}</div>}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Anrede</label>
          <select name="gender" defaultValue={user?.profile?.gender || ''} className="input-field">
            <option value="">Bitte wählen</option>
            <option value="Herr">Herr</option>
            <option value="Frau">Frau</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Vorname *</label>
          <input name="firstName" defaultValue={user?.profile?.firstName || ''} className="input-field" required />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Nachname *</label>
          <input name="lastName" defaultValue={user?.profile?.lastName || ''} className="input-field" required />
        </div>
        {!user && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>E-Mail *</label>
              <input name="email" type="email" className="input-field" required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Passwort *</label>
              <input name="password" type="password" className="input-field" required minLength={6} />
            </div>
          </>
        )}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Straße *</label>
          <input name="street" defaultValue={user?.profile?.street || ''} className="input-field" required placeholder="Straße und Hausnummer" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>PLZ *</label>
          <input name="postalCode" defaultValue={user?.profile?.postalCode || ''} className="input-field" required placeholder="12345" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Ort *</label>
          <input name="city" defaultValue={user?.profile?.city || ''} className="input-field" required />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Telefon</label>
          <input name="phone" defaultValue={user?.profile?.phone || ''} className="input-field" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Objekt</label>
          <input name="objectName" defaultValue={user?.profile?.objectName || ''} className="input-field" placeholder="z.B. Wohnung 1" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Kundennummer</label>
          <input name="customerNumber" defaultValue={user?.profile?.customerNumber || (user ? '' : generateCustomerNumber())} className="input-field" placeholder={!user ? generateCustomerNumber() : ''} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button type="submit" className="btn btn-primary">{user ? 'Änderungen speichern' : 'Kunde erstellen'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>{user ? 'Abbrechen' : 'Abbrechen'}</button>
      </div>
    </form>
  )

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
          { id: 'users', label: 'Kunden', icon: Users },
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#90EE90' }}>Kundenverwaltung</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={exportUsersCSV}>
                <Download size={18} style={{ marginRight: '8px' }} /> CSV Export
              </button>
              <button className="btn btn-primary" onClick={() => { setShowUserForm(!showUserForm); setEditingUser(null); setError(''); setSuccess(''); }}>
                <Plus size={18} style={{ marginRight: '8px' }} /> Neuer Kunde
              </button>
            </div>
          </div>

          {showUserForm && <UserForm user={null} onSubmit={createUser} onCancel={() => setShowUserForm(false)} />}
          
          {editingUser && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>Kunde bearbeiten</h3>
              <UserForm user={editingUser} onSubmit={updateUser} onCancel={() => setEditingUser(null)} />
            </div>
          )}

          {installmentUser && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>
                Abschlag setzen: {installmentUser.profile?.firstName} {installmentUser.profile?.lastName}
              </h3>
              {error && <div style={{ color: '#ff6b6b', marginBottom: '15px' }}>{error}</div>}
              <form onSubmit={createInstallment} style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '20px',
                borderRadius: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Monatlicher Abschlag (€)</label>
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
                  <button type="submit" className="btn btn-primary">Abschlag setzen</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setInstallmentUser(null)}>Abbrechen</button>
                </div>
              </form>
            </div>
          )}

          {meterUser && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>
                Zählerstände: {meterUser.profile?.firstName} {meterUser.profile?.lastName}
              </h3>
              {error && <div style={{ color: '#ff6b6b', marginBottom: '15px' }}>{error}</div>}
              {success && <div style={{ color: '#90EE90', marginBottom: '15px' }}>{success}</div>}
              <form onSubmit={createMeterEntry} style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '15px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Datum</label>
                  <input
                    type="date"
                    className="input-field"
                    value={newMeterEntry.date}
                    onChange={(e) => setNewMeterEntry({ ...newMeterEntry, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Zählerstand (kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={newMeterEntry.value}
                    onChange={(e) => setNewMeterEntry({ ...newMeterEntry, value: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Kommentar</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newMeterEntry.comment}
                    onChange={(e) => setNewMeterEntry({ ...newMeterEntry, comment: e.target.value })}
                    placeholder="z.B. Ablesung durch Versorger"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">Erfassen</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setMeterUser(null)}>Schließen</button>
                </div>
              </form>

              {(() => {
                const now = new Date()
                const months: { [key: string]: number } = {}
                for (let i = 11; i >= 0; i--) {
                  const d = subMonths(now, i)
                  months[format(d, 'yyyy-MM')] = 0
                }
                const sorted = [...meterEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                sorted.forEach(e => {
                  const key = format(new Date(e.date), 'yyyy-MM')
                  if (months[key] !== undefined && e.consumption) months[key] += e.consumption
                })
                const mData = Object.entries(months).map(([m, v]) => ({
                  month: format(new Date(m + '-01'), 'MMM yy', { locale: de }),
                  verbrauch: Math.round(v * 10) / 10,
                }))

                const years: { [key: string]: number } = {}
                for (let i = 9; i >= 0; i--) years[(now.getFullYear() - i).toString()] = 0
                sorted.forEach(e => {
                  const y = getYear(new Date(e.date)).toString()
                  if (years[y] !== undefined && e.consumption) years[y] += e.consumption
                })
                const yData = Object.entries(years).map(([y, v]) => ({
                  year: y,
                  verbrauch: Math.round(v * 10) / 10,
                }))

                const mXValues = new Set(mData.map(d => d.month))
                const yXValues = new Set(yData.map(d => d.year))
                const mEvents: ChartEvent[] = []
                const yEvents: ChartEvent[] = []

                meterUserInstallments.forEach(inst => {
                  const mx = format(new Date(inst.validFrom), 'MMM yy', { locale: de })
                  const yx = getYear(new Date(inst.validFrom)).toString()
                  if (mXValues.has(mx)) mEvents.push({ x: mx, label: `${inst.amount}€/M`, color: EVENT_COLORS.installment })
                  if (yXValues.has(yx)) yEvents.push({ x: yx, label: `${inst.amount}€/M`, color: EVENT_COLORS.installment })
                })
                tariffs.forEach(t => {
                  const mx = format(new Date(t.validFrom), 'MMM yy', { locale: de })
                  const yx = getYear(new Date(t.validFrom)).toString()
                  if (mXValues.has(mx)) mEvents.push({ x: mx, label: `${t.energyPrice}€/kWh`, color: EVENT_COLORS.tariff })
                  if (yXValues.has(yx)) yEvents.push({ x: yx, label: `${t.energyPrice}€/kWh`, color: EVENT_COLORS.tariff })
                })
                meterUserInvoices.forEach(inv => {
                  const mx = format(new Date(inv.createdAt), 'MMM yy', { locale: de })
                  const yx = getYear(new Date(inv.createdAt)).toString()
                  if (mXValues.has(mx)) mEvents.push({ x: mx, label: 'Abr.', color: EVENT_COLORS.invoice })
                  if (yXValues.has(yx)) yEvents.push({ x: yx, label: 'Abr.', color: EVENT_COLORS.invoice })
                })

                const ttpStyle = {
                  contentStyle: { background: '#1a2e1a', border: '1px solid #FFD700', borderRadius: '8px' },
                  labelStyle: { color: '#FFD700' },
                }

                return (
                  <>
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '15px', marginBottom: '15px' }}>
                      <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>Verbrauch letzte 12 Monate</h4>
                      <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={mData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="month" stroke="#aaa" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#aaa" tick={{ fontSize: 11 }} />
                            <Tooltip {...ttpStyle} formatter={(value: number) => [`${value.toLocaleString()} kWh`, 'Verbrauch']} />
                            {mEvents.map((evt, i) => (
                              <ReferenceLine key={`ame-${i}`} x={evt.x} stroke={evt.color} strokeDasharray="5 5" label={{ value: evt.label, position: 'top', fill: evt.color, fontSize: 9 }} />
                            ))}
                            <Line type="monotone" dataKey="verbrauch" stroke="#FFD700" strokeWidth={2} dot={{ fill: '#FFD700', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#FFD700' }} name="Verbrauch (kWh)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <ChartLegend />
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '15px', marginBottom: '15px' }}>
                      <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>Verbrauch letzte 10 Jahre</h4>
                      <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={yData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="year" stroke="#aaa" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#aaa" tick={{ fontSize: 11 }} />
                            <Tooltip {...ttpStyle} formatter={(value: number) => [`${value.toLocaleString()} kWh`, 'Verbrauch']} />
                            {yEvents.map((evt, i) => (
                              <ReferenceLine key={`aye-${i}`} x={evt.x} stroke={evt.color} strokeDasharray="5 5" label={{ value: evt.label, position: 'top', fill: evt.color, fontSize: 9 }} />
                            ))}
                            <Line type="monotone" dataKey="verbrauch" stroke="#228B22" strokeWidth={2} dot={{ fill: '#228B22', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#228B22' }} name="Verbrauch (kWh)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <ChartLegend />
                    </div>
                  </>
                )
              })()}

              {meterEntries.length > 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '15px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Datum</th>
                        <th>Zählerstand (kWh)</th>
                        <th>Verbrauch (kWh)</th>
                        <th>Kommentar</th>
                        <th>Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meterEntries.map(entry => (
                        editingMeterEntry?.id === entry.id ? (
                          <tr key={entry.id}>
                            <td><input type="date" className="input-field" style={{ padding: '4px 8px', fontSize: '0.85rem' }} value={editingMeterEntry.date} onChange={(e) => setEditingMeterEntry({ ...editingMeterEntry, date: e.target.value })} required /></td>
                            <td><input type="number" step="0.01" className="input-field" style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100px' }} value={editingMeterEntry.value} onChange={(e) => setEditingMeterEntry({ ...editingMeterEntry, value: e.target.value })} required /></td>
                            <td>-</td>
                            <td><input type="text" className="input-field" style={{ padding: '4px 8px', fontSize: '0.85rem' }} value={editingMeterEntry.comment} onChange={(e) => setEditingMeterEntry({ ...editingMeterEntry, comment: e.target.value })} /></td>
                            <td>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={updateMeterEntry} title="Speichern" style={{ background: 'none', border: 'none', color: '#90EE90', cursor: 'pointer' }}><CheckCircle size={16} /></button>
                                <button onClick={() => setEditingMeterEntry(null)} title="Abbrechen" style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={entry.id}>
                            <td>{format(new Date(entry.date), 'dd.MM.yyyy')}</td>
                            <td style={{ color: '#FFD700' }}>{entry.value.toFixed(2)}</td>
                            <td>{entry.consumption != null ? `${entry.consumption.toFixed(2)}` : '-'}</td>
                            <td style={{ color: '#aaa', fontSize: '0.85rem' }}>{entry.comment || '-'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => setEditingMeterEntry({ id: entry.id, date: format(new Date(entry.date), 'yyyy-MM-dd'), value: String(entry.value), comment: entry.comment || '' })} title="Bearbeiten" style={{ background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer' }}>
                                  <Edit size={16} />
                                </button>
                                <button onClick={() => deleteMeterEntry(entry.id)} title="Löschen" style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#aaa', fontStyle: 'italic' }}>Keine Zählerstände vorhanden.</p>
              )}
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>Kundennr.</th>
                <th>Anrede</th>
                <th>Name</th>
                <th>Adresse</th>
                <th>Telefon</th>
                <th>E-Mail</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role === 'USER').map(user => (
                <tr key={user.id}>
                  <td>{user.profile?.customerNumber || '-'}</td>
                  <td>{user.profile?.gender || '-'}</td>
                  <td>{user.profile?.firstName} {user.profile?.lastName}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {user.profile?.street}<br/>
                    {user.profile?.postalCode} {user.profile?.city}
                  </td>
                  <td>{user.profile?.phone || '-'}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => { setEditingUser(user); setShowUserForm(false); setInstallmentUser(null); setMeterUser(null); setError(''); setSuccess(''); }} title="Bearbeiten" style={{ background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer' }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => { setInstallmentUser(user); setEditingUser(null); setShowUserForm(false); setMeterUser(null); setError(''); setSuccess(''); }} title="Abschlag setzen" style={{ background: 'none', border: 'none', color: '#228B22', cursor: 'pointer' }}>
                        <Euro size={16} />
                      </button>
                      <button onClick={() => openMeterDialog(user)} title="Zählerstände" style={{ background: 'none', border: 'none', color: '#87CEEB', cursor: 'pointer' }}>
                        <Gauge size={16} />
                      </button>
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
                      <button className="btn btn-secondary" onClick={() => exportBillingCSV(period.id)}>
                        <Download size={16} style={{ marginRight: '5px' }} /> CSV Export
                      </button>
                      <button className="btn btn-secondary" style={{ borderColor: '#90EE90', color: '#90EE90' }} onClick={() => { if (confirm('Abrechnungsperiode abschließen? Dies kann nicht rückgängig gemacht werden.')) handlePeriodAction(period.id, 'complete') }}>
                        <Lock size={16} style={{ marginRight: '5px' }} /> Abschließen
                      </button>
                    </>
                  )}
                  {period.status === 'COMPLETED' && (
                    <button className="btn btn-secondary" onClick={() => exportBillingCSV(period.id)}>
                      <Download size={16} style={{ marginRight: '5px' }} /> CSV Export
                    </button>
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


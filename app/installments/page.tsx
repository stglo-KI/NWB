'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { LogOut, User, Gauge } from 'lucide-react'
import Link from 'next/link'

interface Installment {
  id: string
  amount: number
  validFrom: string
  validTo: string | null
}

interface Tariff {
  id: string
  name: string
  energyPrice: number
  basePrice: number
  validFrom: string
}

export default function InstallmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [installments, setInstallments] = useState<Installment[]>([])
  const [tariff, setTariff] = useState<Tariff | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    const [instRes, tariffRes] = await Promise.all([
      fetch('/api/installments'),
      fetch('/api/tariffs'),
    ])
    const instData = await instRes.json()
    const tariffData = await tariffRes.json()
    
    setInstallments(instData)
    if (tariffData.length > 0) {
      setTariff(tariffData[0])
    }
    setLoading(false)
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

      {tariff && (
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
          <h3 style={{ color: '#FFD700', marginBottom: '10px' }}>Aktueller Tarif</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Bezeichnung</div>
              <div style={{ color: '#e8e8e8', fontWeight: '500' }}>{tariff.name}</div>
            </div>
            <div>
              <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Arbeitspreis</div>
              <div style={{ color: '#228B22', fontWeight: 'bold', fontSize: '1.2rem' }}>{tariff.energyPrice.toFixed(3)} €/kWh</div>
            </div>
            <div>
              <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Grundpreis</div>
              <div style={{ color: '#e8e8e8', fontWeight: '500' }}>{tariff.basePrice.toFixed(2)} €/Jahr</div>
            </div>
          </div>
        </div>
      )}

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
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#90EE90' }}>Abschlags-Historie</h2>
        </div>

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

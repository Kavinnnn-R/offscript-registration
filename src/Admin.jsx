
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Download,
  RefreshCw,
  LockKeyhole,
  Users,
  ClipboardList,
  IndianRupee,
  LogOut,
  Ticket,
  Search
} from 'lucide-react'
import './Admin.css'

const money = value =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))

const dateText = value =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—'

const emptySummary = {
  registrations: 0,
  participants: 0,
  paidRegistrations: 0,
  paidParticipants: 0,
  totalPaidAmount: 0,
  pendingAmount: 0
}

export default function Admin() {
  const [key, setKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [registrations, setRegistrations] = useState([])
  const [summary, setSummary] = useState(emptySummary)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')

  const load = async adminKey => {
    setLoading(true)
    setStatus('')

    try {
      const headers = { 'x-admin-key': adminKey }

      const [registrationResponse, summaryResponse] = await Promise.all([
        fetch('/api/admin/registrations', { headers }),
        fetch('/api/admin/summary', { headers })
      ])

      const registrationData = await registrationResponse
        .json()
        .catch(() => ({}))

      const summaryData = await summaryResponse
        .json()
        .catch(() => ({}))

      if (!registrationResponse.ok || !summaryResponse.ok) {
        throw new Error(
          registrationData.message ||
            summaryData.message ||
            'Unable to load admin data.'
        )
      }

      setRegistrations(registrationData.registrations || [])
      setSummary({ ...emptySummary, ...summaryData })
      setSavedKey(adminKey)
      sessionStorage.setItem('elvora_admin_key', adminKey)
    } catch (error) {
      setStatus(error.message || 'Unable to connect to server.')
      setSavedKey('')
      sessionStorage.removeItem('elvora_admin_key')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const existing = sessionStorage.getItem('elvora_admin_key')
    if (existing) {
      setKey(existing)
      load(existing)
    }
  }, [])

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim()

    return registrations.filter(registration => {
      const attendees = registration.attendees || []

      const matchesSearch =
        !query ||
        [
          registration.registration_code,
          registration.event_name,
          registration.payment_status,
          registration.registration_status,
          ...attendees.flatMap(attendee => [
            attendee.full_name,
            attendee.phone,
            attendee.email,
            attendee.profession,
            attendee.pass_code
          ])
        ].some(value =>
          String(value || '').toLowerCase().includes(query)
        )

      const paymentStatus = String(
        registration.payment_status || 'pending'
      ).toLowerCase()

      const matchesPayment =
        paymentFilter === 'all' || paymentStatus === paymentFilter

      return matchesSearch && matchesPayment
    })
  }, [registrations, search, paymentFilter])

  const signIn = async event => {
    event.preventDefault()
    await load(key.trim())
  }

  const signOut = () => {
    sessionStorage.removeItem('elvora_admin_key')
    setKey('')
    setSavedKey('')
    setRegistrations([])
    setSummary(emptySummary)
    setSearch('')
    setPaymentFilter('all')
    setStatus('')
  }

  const exportCsv = () => {
    const rows = [
      [
        'Registration code',
        'Registration date',
        'Event',
        'Payment status',
        'Registration status',
        'Participant count',
        'Amount due',
        'Participant order',
        'Participant name',
        'Phone',
        'Email',
        'Profession',
        'Age group',
        'Pass code'
      ]
    ]

    for (const registration of filtered) {
      const attendees = registration.attendees?.length
        ? registration.attendees
        : [{}]

      for (const attendee of attendees) {
        rows.push([
          registration.registration_code,
          registration.created_at,
          registration.event_name,
          registration.payment_status,
          registration.registration_status,
          registration.participant_count,
          registration.amount_due,
          attendee.participant_order,
          attendee.full_name,
          attendee.phone,
          attendee.email,
          attendee.profession,
          attendee.age_group,
          attendee.pass_code
        ])
      }
    }

    const csvCell = value => {
      let text = String(value ?? '')

      // Reduce the risk of spreadsheet formula injection.
      if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text
      }

      return `"${text.replace(/"/g, '""')}"`
    }

    const csv = rows
      .map(row => row.map(csvCell).join(','))
      .join('\r\n')

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'offscript-registrations.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (!savedKey) {
    return (
      <main className="admin-shell">
        <div className="admin-login">
          <a href="/" className="admin-back">
            <ArrowLeft size={16} />
            Back to event page
          </a>

          <div className="section-kicker">
            <LockKeyhole size={16} />
            PRIVATE ADMIN ACCESS
          </div>

          <h1>
            ELVORA <em>Dashboard</em>
          </h1>

          <p>
            View registration, payment and participant details from your
            phone or computer.
          </p>

          <form onSubmit={signIn}>
            <label className="field-label" htmlFor="admin-key">
              Admin key
            </label>

            <input
              id="admin-key"
              type="password"
              className="form-control cinematic-input"
              value={key}
              onChange={event => setKey(event.target.value)}
              placeholder="Enter your private admin key"
              required
              autoComplete="current-password"
            />

            {status && (
              <div className="form-status error mt-3">{status}</div>
            )}

            <button
              type="submit"
              className="submit-button mt-3"
              disabled={loading}
            >
              {loading ? 'Checking access…' : 'Open dashboard'}
            </button>
          </form>

          <small>
            Use the ADMIN_KEY configured in your server environment.
            Never share it with registrants.
          </small>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <a href="/" className="brand-lockup">
          <span className="brand-mark">E</span>
          <span>
            <strong>ELVORA</strong>
            <small>EVENTS · ADMIN</small>
          </span>
        </a>

        <div className="admin-actions">
          <button
            type="button"
            onClick={() => load(savedKey)}
            className="admin-ghost"
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            type="button"
            onClick={signOut}
            className="admin-ghost"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      <section className="admin-content">
        <div className="section-kicker">
          PRIVATE REGISTRATION OVERVIEW
        </div>

        <h1>
          Welcome <em>back.</em>
        </h1>

        <p className="admin-lede">
          Monitor registrations, attendees and payment status.
        </p>

        {status && (
          <div className="form-status error">{status}</div>
        )}

        <div className="admin-stat-grid">
          <div className="admin-stat">
            <ClipboardList />
            <span>Total registrations</span>
            <strong>{summary.registrations}</strong>
          </div>

          <div className="admin-stat">
            <Users />
            <span>Total participants</span>
            <strong>{summary.participants}</strong>
          </div>

          <div className="admin-stat">
            <IndianRupee />
            <span>Total amount received*</span>
            <strong>{money(summary.totalPaidAmount)}</strong>
          </div>

          <div className="admin-stat">
            <Ticket />
            <span>Paid registrations</span>
            <strong>{summary.paidRegistrations}</strong>
          </div>

          <div className="admin-stat">
            <IndianRupee />
            <span>Amount awaiting payment*</span>
            <strong>{money(summary.pendingAmount)}</strong>
          </div>
        </div>

        <div className="admin-list-head">
          <div>
            <h2>Registration records</h2>
            <p>
              *Amounts reflect backend payment status; verify transactions
              with Razorpay for financial reconciliation.
            </p>
          </div>

          <button
            type="button"
            className="admin-export"
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <div className="admin-filters">
          <div className="admin-search-wrap">
            <Search size={17} />
            <input
              className="form-control cinematic-input admin-search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search name, phone, email, pass code..."
              aria-label="Search registrations"
            />
          </div>

          <label className="admin-filter-label">
            Payment status
            <select
              className="form-control cinematic-input admin-filter-select"
              value={paymentFilter}
              onChange={event => setPaymentFilter(event.target.value)}
            >
              <option value="all">All registrations</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>

        {loading && (
          <p className="admin-muted">Loading records…</p>
        )}

        {!filtered.length && !loading ? (
          <div className="admin-empty">
            No registrations match your search or filter.
          </div>
        ) : (
          <div className="admin-records">
            {filtered.map(registration => (
              <article
                className="admin-record"
                key={registration.id}
              >
                <div className="record-head">
                  <div>
                    <span className="record-code">
                      {registration.registration_code}
                    </span>

                    <h3>
                      {registration.participant_count}{' '}
                      {registration.participant_count === 1
                        ? 'participant'
                        : 'participants'}
                    </h3>
                  </div>

                  <span
                    className={`payment-pill ${String(
                      registration.payment_status || 'pending'
                    ).toLowerCase()}`}
                  >
                    {registration.payment_status || 'pending'}
                  </span>
                </div>

                <div className="record-meta">
                  <span>{dateText(registration.created_at)}</span>
                  <strong>{money(registration.amount_due)}</strong>
                </div>

                <div className="admin-registration-status">
                  Registration status:{' '}
                  <strong>
                    {registration.registration_status || 'unknown'}
                  </strong>
                </div>

                {(registration.attendees || []).map((attendee, index) => (
                  <div
                    className="attendee"
                    key={attendee.id || attendee.pass_code || index}
                  >
                    <strong>
                      {attendee.participant_order || index + 1}.{' '}
                      {attendee.full_name || 'Name not available'}
                    </strong>

                    <span>
                      {attendee.phone || 'No phone'} ·{' '}
                      {attendee.email || 'No email'}
                    </span>

                    <span>
                      {attendee.profession || 'Profession not provided'}
                      {' · Age group '}
                      {attendee.age_group || '—'}
                    </span>

                    <div className="attendee-pass">
                      <Ticket size={15} />
                      <span>Entry pass code:</span>
                      <strong>
                        {attendee.pass_code || 'Not generated'}
                      </strong>
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}

        <p className="admin-footnote">
          Keep this dashboard private. Only authorised admins should
          access participant contact details and pass codes.
        </p>
      </section>
    </main>
  )
}

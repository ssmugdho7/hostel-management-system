import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '')
const API_ORIGIN = API_BASE.replace(/\/api$/, '')

const customerNav = [
  ['dashboard', 'Dashboard'],
  ['seats', 'Seat Change'],
  ['rent', 'Rent'],
  ['leave', 'Leave'],
  ['exit', 'Exit'],
  ['notifications', 'Notifications'],
  ['announcements', 'Announcements'],
  ['profile', 'Profile'],
]

const adminNav = [
  ['admin-dashboard', 'Overview'],
  ['admin-requests', 'Requests'],
  ['admin-announcements', 'Announcements'],
  ['profile', 'Profile'],
]

let csrfPromise

class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

async function ensureCsrf() {
  if (!csrfPromise) {
    csrfPromise = (async () => {
      const targets = [`${API_ORIGIN}/sanctum/csrf-cookie`, `${API_BASE}/sanctum/csrf-cookie`]
      for (const target of targets) {
        try {
          const response = await fetch(target, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          })
          if (response.ok) return
        } catch {
          // Try the project-local fallback route next.
        }
      }
    })()
  }

  return csrfPromise
}

async function apiRequest(path, options = {}) {
  const method = options.method || 'GET'
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  if (method !== 'GET') {
    await ensureCsrf()
    const xsrf = getCookie('XSRF-TOKEN')
    if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf)
  }

  const hasBody = Object.prototype.hasOwnProperty.call(options, 'body')
  if (hasBody && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    credentials: 'include',
    headers,
    body: hasBody && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(data?.message || 'Request failed', response.status, data?.errors || {})
  }

  return data
}

function formatMoney(value) {
  const amount = Number(value || 0)
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} BDT`
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function seatLabel(seat) {
  if (!seat) return 'No seat assigned'
  const room = seat.room?.name ? `${seat.room.name} / ` : ''
  const branch = seat.room?.branch?.name ? ` - ${seat.room.branch.name}` : ''
  return `${room}${seat.label}${branch}`
}

function fieldsFromErrors(errors) {
  return Object.values(errors || {}).flat().join(' ')
}

function StatusPill({ status }) {
  return <span className={`pill ${status || 'neutral'}`}>{status || 'unknown'}</span>
}

function FieldError({ errors, name }) {
  if (!errors?.[name]) return null
  return <span className="field-error">{errors[name][0]}</span>
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}

function LoadingBlock({ label = 'Loading data...' }) {
  return <div className="loading-block">{label}</div>
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`stat-card ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {action}
    </div>
  )
}

function AuthScreen({ onLogin, notify }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    name: '',
    email: 'rahim@hostel.test',
    phone: '',
    nid: '',
    password: 'password123',
    password_confirmation: '',
  })

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : {
              name: form.name,
              email: form.email,
              phone: form.phone,
              nid: form.nid,
              password: form.password,
              password_confirmation: form.password_confirmation,
            }

      const data = await apiRequest(`/auth/${mode}`, { method: 'POST', body: payload })
      if (mode === 'register') {
        notify(data.message)
        setMode('login')
      } else {
        onLogin(data.user)
      }
    } catch (error) {
      setErrors(error.errors || {})
      notify(fieldsFromErrors(error.errors) || error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-block">
          <span className="brand-mark">HM</span>
          <div>
            <h1>Hostel Management</h1>
            <p>Resident and admin workspace</p>
          </div>
        </div>

        <div className="segmented" role="tablist" aria-label="Authentication">
          <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>
            Login
          </button>
          <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        <form className="form-grid" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>
                Name
                <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
                <FieldError errors={errors} name="name" />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={(event) => update('phone', event.target.value)} required />
                <FieldError errors={errors} name="phone" />
              </label>
              <label>
                NID
                <input value={form.nid} onChange={(event) => update('nid', event.target.value)} required />
                <FieldError errors={errors} name="nid" />
              </label>
            </>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
            <FieldError errors={errors} name="email" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              required
            />
            <FieldError errors={errors} name="password" />
          </label>
          {mode === 'register' && (
            <label>
              Confirm Password
              <input
                type="password"
                value={form.password_confirmation}
                onChange={(event) => update('password_confirmation', event.target.value)}
                required
              />
            </label>
          )}
          <button className="primary-action" type="submit" disabled={loading}>
            {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>

        <div className="demo-logins">
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, email: 'rahim@hostel.test', password: 'password123' }))}
          >
            Customer demo
          </button>
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, email: 'admin@hostel.test', password: 'password123' }))}
          >
            Admin demo
          </button>
        </div>
      </section>
    </main>
  )
}

function AppShell({ user, view, setView, onLogout, children }) {
  const nav = user.role === 'admin' ? adminNav : customerNav

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block compact">
          <span className="brand-mark">HM</span>
          <div>
            <strong>Hostel MS</strong>
            <span>{user.role === 'admin' ? 'Admin console' : 'Resident portal'}</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Primary">
          {nav.map(([key, label]) => (
            <button className={view === key ? 'active' : ''} type="button" key={key} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </nav>

        <div className="user-strip">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  )
}

function PageTitle({ title, subtitle }) {
  return (
    <header className="page-title">
      <div>
        <span>Hostel Management System</span>
        <h1>{title}</h1>
      </div>
      {subtitle && <p>{subtitle}</p>}
    </header>
  )
}

function CustomerDashboard({ notify }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      setData(await apiRequest('/dashboard'))
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  if (loading) return <LoadingBlock />
  if (!data) return <EmptyState title="Dashboard unavailable" detail="Refresh the page after the API is running." />

  return (
    <>
      <PageTitle title="Dashboard" subtitle={seatLabel(data.current_seat)} />
      <section className="stat-grid">
        <StatCard label="Current balance" value={formatMoney(data.balance)} tone={Number(data.balance) < 0 ? 'danger' : ''} />
        <StatCard label="Consumed rent" value={formatMoney(data.consumed_rent)} />
        <StatCard label="Covered days" value={data.remaining_days_coverage} />
        <StatCard label="Unread notices" value={data.summary?.unread_notifications || 0} />
      </section>

      <section className="two-column">
        <div className="panel">
          <SectionHeader title="Due bills" />
          {data.due_bills?.length ? (
            <div className="item-list">
              {data.due_bills.map((bill) => (
                <article className="list-item" key={bill.id}>
                  <div>
                    <strong>{bill.period_month}</strong>
                    <span>Due {formatDate(bill.due_date)}</span>
                  </div>
                  <div className="right">
                    <StatusPill status={bill.status} />
                    <strong>{formatMoney(Number(bill.amount_due) - Number(bill.amount_paid))}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No due bills" detail="Rent billing is clear for now." />
          )}
        </div>

        <div className="panel">
          <SectionHeader title="Pending requests" />
          <section className="mini-stats">
            <StatCard label="Seat changes" value={data.summary?.pending_seat_changes || 0} />
            <StatCard label="Leaves" value={data.summary?.pending_leaves || 0} />
            <StatCard label="Exits" value={data.summary?.pending_exits || 0} />
          </section>
        </div>
      </section>

      <section className="two-column">
        <FeedPanel title="Recent notifications" items={data.recent_notifications} />
        <FeedPanel title="Announcements" items={data.announcements} />
      </section>
    </>
  )
}

function FeedPanel({ title, items = [] }) {
  return (
    <div className="panel">
      <SectionHeader title={title} />
      {items.length ? (
        <div className="item-list">
          {items.map((item) => (
            <article className="list-item stacked" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
              <small>{formatDate(item.created_at || item.published_at)}</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing here yet" detail="New updates will appear here." />
      )}
    </div>
  )
}

function SeatsPage({ notify }) {
  const [seats, setSeats] = useState([])
  const [requests, setRequests] = useState([])
  const [selectedSeat, setSelectedSeat] = useState('')
  const [requestedDate, setRequestedDate] = useState(today())
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const [availableSeats, seatRequests] = await Promise.all([
        apiRequest('/seats?available_only=1'),
        apiRequest('/seat-change-requests'),
      ])
      setSeats(availableSeats)
      setRequests(seatRequests)
      setSelectedSeat((current) => current || availableSeats[0]?.id?.toString() || '')
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  async function runPreview() {
    if (!selectedSeat) return
    setSubmitting(true)
    try {
      setPreview(
        await apiRequest('/seat-change-requests/preview', {
          method: 'POST',
          body: { to_seat_id: selectedSeat },
        }),
      )
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitRequest(event) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const data = await apiRequest('/seat-change-requests', {
        method: 'POST',
        body: { to_seat_id: selectedSeat, requested_date: requestedDate, note },
      })
      notify(data.message)
      setNote('')
      setPreview(null)
      await load()
    } catch (error) {
      notify(fieldsFromErrors(error.errors) || error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Seat Change" subtitle="Preview billing before submitting a seat change request." />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submitRequest}>
          <SectionHeader title="New request" />
          <label>
            Target seat
            <select value={selectedSeat} onChange={(event) => setSelectedSeat(event.target.value)} required>
              {seats.map((seat) => (
                <option value={seat.id} key={seat.id}>
                  {seatLabel(seat)} - {formatMoney(seat.price_per_day)}/day
                </option>
              ))}
            </select>
          </label>
          <label>
            Requested date
            <input type="date" min={today()} value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} />
          </label>
          <label>
            Note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows="4" />
          </label>
          <div className="button-row">
            <button type="button" className="secondary-action" disabled={submitting || !selectedSeat} onClick={runPreview}>
              Preview
            </button>
            <button className="primary-action" disabled={submitting || !selectedSeat} type="submit">
              Submit request
            </button>
          </div>
        </form>

        <div className="panel">
          <SectionHeader title="Billing preview" />
          {preview ? (
            <div className="detail-grid">
              <span>From</span>
              <strong>{seatLabel(preview.from_seat)}</strong>
              <span>To</span>
              <strong>{seatLabel(preview.to_seat)}</strong>
              <span>Request type</span>
              <strong>{preview.type?.replace('_', ' ')}</strong>
              <span>Remaining days</span>
              <strong>{preview.remaining_days}</strong>
              <span>Payable</span>
              <strong>{formatMoney(preview.payable_amount)}</strong>
              <span>Carry forward</span>
              <strong>{formatMoney(preview.excess_carry_forward)}</strong>
              <p className="full-row">{preview.note}</p>
            </div>
          ) : (
            <EmptyState title="Preview not generated" detail="Select a seat and run preview." />
          )}
        </div>
      </section>

      <RequestsTable
        title="My seat change requests"
        rows={requests}
        columns={[
          ['From', (row) => seatLabel(row.from_seat)],
          ['To', (row) => seatLabel(row.to_seat)],
          ['Date', (row) => formatDate(row.requested_date)],
          ['Payable', (row) => formatMoney(row.payable_amount)],
          ['Status', (row) => <StatusPill status={row.status} />],
        ]}
      />
    </>
  )
}

function RentPage({ notify }) {
  const [data, setData] = useState(null)
  const [payments, setPayments] = useState([])
  const [form, setForm] = useState({ bill_id: '', amount: '', method: 'bkash' })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const [bills, history] = await Promise.all([apiRequest('/rent/bills'), apiRequest('/rent/history')])
      setData(bills)
      setPayments(history)
      const dueBill = bills.bills?.find((bill) => bill.status !== 'paid')
      setForm((current) => ({
        ...current,
        bill_id: current.bill_id || dueBill?.id?.toString() || '',
        amount: current.amount || (dueBill ? String(Number(dueBill.amount_due) - Number(dueBill.amount_paid)) : ''),
      }))
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  async function submit(event) {
    event.preventDefault()
    try {
      const data = await apiRequest('/rent/pay', {
        method: 'POST',
        body: {
          bill_id: form.bill_id || undefined,
          amount: form.amount,
          method: form.method,
        },
      })
      notify(data.message)
      setForm({ bill_id: '', amount: '', method: 'bkash' })
      await load()
    } catch (error) {
      notify(fieldsFromErrors(error.errors) || error.message, 'error')
    }
  }

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Rent" subtitle="Review bills, balance, and payment history." />
      <section className="stat-grid">
        <StatCard label="Current balance" value={formatMoney(data?.current_balance)} />
        <StatCard label="Consumed rent" value={formatMoney(data?.consumed_rent)} />
        <StatCard label="Covered days" value={data?.remaining_days_coverage || 0} />
      </section>

      <section className="two-column align-start">
        <div className="panel">
          <SectionHeader title="Bills" />
          <div className="item-list">
            {data?.bills?.map((bill) => (
              <article className="list-item" key={bill.id}>
                <div>
                  <strong>{bill.period_month}</strong>
                  <span>Due {formatDate(bill.due_date)}</span>
                </div>
                <div className="right">
                  <StatusPill status={bill.status} />
                  <strong>{formatMoney(Number(bill.amount_due) - Number(bill.amount_paid))}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="Record payment" />
          <label>
            Bill
            <select value={form.bill_id} onChange={(event) => setForm((current) => ({ ...current, bill_id: event.target.value }))}>
              <option value="">Advance payment</option>
              {data?.bills?.map((bill) => (
                <option value={bill.id} key={bill.id}>
                  {bill.period_month} - {bill.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="1"
              step="1"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              required
            />
          </label>
          <label>
            Method
            <select value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          <button className="primary-action" type="submit">
            Pay rent
          </button>
        </form>
      </section>

      <RequestsTable
        title="Payment history"
        rows={payments}
        columns={[
          ['Date', (row) => formatDate(row.paid_at || row.created_at)],
          ['Type', (row) => row.type],
          ['Direction', (row) => row.direction],
          ['Method', (row) => row.method || 'N/A'],
          ['Amount', (row) => formatMoney(row.amount)],
          ['Status', (row) => <StatusPill status={row.status} />],
        ]}
      />
    </>
  )
}

function LeavePage({ notify }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ start_date: today(), end_date: today(), reason: '' })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      setRows(await apiRequest('/leave-applications'))
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  async function submit(event) {
    event.preventDefault()
    try {
      const data = await apiRequest('/leave-applications', { method: 'POST', body: form })
      notify(data.message)
      setForm({ start_date: today(), end_date: today(), reason: '' })
      await load()
    } catch (error) {
      notify(fieldsFromErrors(error.errors) || error.message, 'error')
    }
  }

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Leave Applications" subtitle="Submit and track leave approval." />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="New leave" />
          <label>
            Start date
            <input
              type="date"
              min={today()}
              value={form.start_date}
              onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              required
            />
          </label>
          <label>
            End date
            <input
              type="date"
              min={form.start_date}
              value={form.end_date}
              onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
              required
            />
          </label>
          <label>
            Reason
            <textarea
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              rows="4"
              required
            />
          </label>
          <button className="primary-action" type="submit">
            Submit leave
          </button>
        </form>

        <RequestsTable
          title="History"
          rows={rows}
          columns={[
            ['Dates', (row) => `${formatDate(row.start_date)} to ${formatDate(row.end_date)}`],
            ['Status', (row) => <StatusPill status={row.status} />],
            ['Reason', (row) => row.reason],
          ]}
        />
      </section>
    </>
  )
}

function ExitPage({ notify }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ requested_exit_date: today(), reason: '' })
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      setRows(await apiRequest('/exit-requests'))
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  async function runPreview() {
    try {
      setPreview(
        await apiRequest('/exit-requests/preview', {
          method: 'POST',
          body: { requested_exit_date: form.requested_exit_date },
        }),
      )
    } catch (error) {
      notify(fieldsFromErrors(error.errors) || error.message, 'error')
    }
  }

  async function submit(event) {
    event.preventDefault()
    try {
      const data = await apiRequest('/exit-requests', { method: 'POST', body: form })
      notify(data.message)
      setForm({ requested_exit_date: today(), reason: '' })
      setPreview(null)
      await load()
    } catch (error) {
      notify(fieldsFromErrors(error.errors) || error.message, 'error')
    }
  }

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Exit Request" subtitle="Check notice period and settlement before submission." />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="New exit request" />
          <label>
            Exit date
            <input
              type="date"
              min={today()}
              value={form.requested_exit_date}
              onChange={(event) => setForm((current) => ({ ...current, requested_exit_date: event.target.value }))}
              required
            />
          </label>
          <label>
            Reason
            <textarea
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              rows="4"
            />
          </label>
          <div className="button-row">
            <button type="button" className="secondary-action" onClick={runPreview}>
              Preview
            </button>
            <button className="primary-action" type="submit">
              Submit exit
            </button>
          </div>
        </form>

        <div className="panel">
          <SectionHeader title="Settlement preview" />
          {preview ? (
            <div className="detail-grid">
              <span>Notice period</span>
              <strong>{preview.notice_period_days} days</strong>
              <span>Days until exit</span>
              <strong>{preview.days_until_exit}</strong>
              <span>Notice valid</span>
              <strong>{preview.notice_valid ? 'Yes' : 'No'}</strong>
              <span>Rent payable</span>
              <strong>{formatMoney(preview.rent_payable)}</strong>
              <span>Deposit refund</span>
              <strong>{formatMoney(preview.deposit_refundable)}</strong>
              <span>Net payable</span>
              <strong>{formatMoney(preview.net_payable)}</strong>
              <p className="full-row">{preview.note}</p>
            </div>
          ) : (
            <EmptyState title="Preview not generated" detail="Choose an exit date and preview." />
          )}
        </div>
      </section>

      <RequestsTable
        title="Exit history"
        rows={rows}
        columns={[
          ['Date', (row) => formatDate(row.requested_exit_date)],
          ['Net payable', (row) => formatMoney(row.net_payable)],
          ['Status', (row) => <StatusPill status={row.status} />],
          ['Reason', (row) => row.reason || 'N/A'],
        ]}
      />
    </>
  )
}

function NotificationsPage({ notify }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      setData(await apiRequest('/notifications'))
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  async function markAllRead() {
    try {
      const response = await apiRequest('/notifications/read-all', { method: 'POST', body: {} })
      notify(response.message)
      await load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  async function markRead(id) {
    try {
      const response = await apiRequest(`/notifications/${id}/read`, { method: 'PUT', body: {} })
      notify(response.message)
      await load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Notifications" subtitle={`${data?.unread_count || 0} unread notifications`} />
      <div className="panel">
        <SectionHeader
          title="Inbox"
          action={
            <button type="button" className="secondary-action" onClick={markAllRead}>
              Mark all read
            </button>
          }
        />
        {data?.notifications?.length ? (
          <div className="item-list">
            {data.notifications.map((item) => (
              <article className={`list-item stacked ${item.read_at ? '' : 'unread'}`} key={item.id}>
                <div className="row-between">
                  <strong>{item.title}</strong>
                  <StatusPill status={item.type} />
                </div>
                <span>{item.body}</span>
                <small>{formatDate(item.created_at)}</small>
                {!item.read_at && item.user_id && (
                  <button className="text-action" type="button" onClick={() => markRead(item.id)}>
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No notifications" detail="Your inbox is clear." />
        )}
      </div>
    </>
  )
}

function AnnouncementsPage({ notify }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    apiRequest('/announcements')
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => notify(error.message, 'error'))
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [notify])

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Announcements" subtitle="Published hostel notices." />
      <div className="announcement-grid">
        {rows.length ? (
          rows.map((item) => (
            <article className="announcement-card" key={item.id}>
              <div className="row-between">
                <StatusPill status={item.audience} />
                <small>{formatDate(item.published_at)}</small>
              </div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))
        ) : (
          <EmptyState title="No announcements" detail="Published notices will appear here." />
        )}
      </div>
    </>
  )
}

function ProfilePage({ notify, onUserUpdate }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', nid: '' })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const data = await apiRequest('/profile')
      setProfile(data)
      setForm({
        name: data.user?.name || '',
        phone: data.user?.phone || '',
        nid: data.user?.nid || '',
      })
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  async function submit(event) {
    event.preventDefault()
    try {
      const data = await apiRequest('/profile', { method: 'PUT', body: form })
      notify(data.message)
      onUserUpdate(data.user)
      await load()
    } catch (error) {
      notify(fieldsFromErrors(error.errors) || error.message, 'error')
    }
  }

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Profile" subtitle={profile?.user?.email} />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="Personal details" />
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label>
            NID
            <input value={form.nid} onChange={(event) => setForm((current) => ({ ...current, nid: event.target.value }))} />
          </label>
          <button className="primary-action" type="submit">
            Save profile
          </button>
        </form>

        <div className="panel">
          <SectionHeader title="Account summary" />
          <div className="detail-grid">
            <span>Role</span>
            <strong>{profile?.user?.role}</strong>
            <span>Status</span>
            <strong>{profile?.user?.status}</strong>
            <span>Seat</span>
            <strong>{seatLabel(profile?.current_seat)}</strong>
            <span>Balance</span>
            <strong>{formatMoney(profile?.balance)}</strong>
            <span>Consumed rent</span>
            <strong>{formatMoney(profile?.consumed_rent)}</strong>
          </div>
        </div>
      </section>
    </>
  )
}

function AdminDashboard({ notify }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      setData(await apiRequest('/admin/dashboard'))
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  if (loading) return <LoadingBlock />

  const stats = data?.stats || {}

  return (
    <>
      <PageTitle title="Admin Overview" subtitle="Live operational summary." />
      <section className="stat-grid admin">
        <StatCard label="Customers" value={stats.total_customers || 0} />
        <StatCard label="Active customers" value={stats.active_customers || 0} />
        <StatCard label="Available seats" value={stats.available_seats || 0} />
        <StatCard label="Occupied seats" value={stats.occupied_seats || 0} />
        <StatCard label="Seat changes" value={stats.pending_seat_changes || 0} />
        <StatCard label="Leaves" value={stats.pending_leaves || 0} />
        <StatCard label="Exits" value={stats.pending_exits || 0} />
      </section>

      <section className="three-column">
        <AdminQueue title="Seat changes" rows={data?.pending_seat_changes} render={(row) => `${row.user?.name} to ${seatLabel(row.to_seat)}`} />
        <AdminQueue title="Leaves" rows={data?.pending_leaves} render={(row) => `${row.user?.name} - ${formatDate(row.start_date)}`} />
        <AdminQueue title="Exits" rows={data?.pending_exits} render={(row) => `${row.user?.name} - ${formatDate(row.requested_exit_date)}`} />
      </section>
    </>
  )
}

function AdminQueue({ title, rows = [], render }) {
  return (
    <div className="panel">
      <SectionHeader title={title} />
      {rows.length ? (
        <div className="item-list compact-list">
          {rows.map((row) => (
            <article className="list-item stacked" key={row.id}>
              <strong>{render(row)}</strong>
              <small>Submitted {formatDate(row.created_at)}</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Queue clear" detail="No pending items." />
      )}
    </div>
  )
}

function AdminRequests({ notify }) {
  const [active, setActive] = useState('seat')
  const [seatRows, setSeatRows] = useState([])
  const [leaveRows, setLeaveRows] = useState([])
  const [exitRows, setExitRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const [seat, leave, exit] = await Promise.all([
        apiRequest('/admin/seat-change-requests'),
        apiRequest('/admin/leave-applications'),
        apiRequest('/admin/exit-requests'),
      ])
      setSeatRows(seat)
      setLeaveRows(leave)
      setExitRows(exit)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  async function action(type, id, decision) {
    const reason = decision === 'reject' ? window.prompt('Rejection reason', 'Not eligible.') : ''
    if (decision === 'reject' && reason === null) return

    try {
      const data = await apiRequest(`/admin/${type}/${id}/${decision}`, {
        method: 'PUT',
        body: reason ? { reason } : {},
      })
      notify(data.message)
      await load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Request Queues" subtitle="Approve or reject pending resident requests." />
      <div className="segmented page-tabs">
        <button className={active === 'seat' ? 'active' : ''} type="button" onClick={() => setActive('seat')}>
          Seat changes
        </button>
        <button className={active === 'leave' ? 'active' : ''} type="button" onClick={() => setActive('leave')}>
          Leaves
        </button>
        <button className={active === 'exit' ? 'active' : ''} type="button" onClick={() => setActive('exit')}>
          Exits
        </button>
      </div>

      {active === 'seat' && (
        <RequestsTable
          title="Seat change requests"
          rows={seatRows}
          columns={[
            ['Resident', (row) => row.user?.name],
            ['From', (row) => seatLabel(row.from_seat)],
            ['To', (row) => seatLabel(row.to_seat)],
            ['Payable', (row) => formatMoney(row.payable_amount)],
            ['Status', (row) => <StatusPill status={row.status} />],
            [
              'Actions',
              (row) =>
                row.status === 'pending' ? (
                  <ActionButtons onApprove={() => action('seat-change-requests', row.id, 'approve')} onReject={() => action('seat-change-requests', row.id, 'reject')} />
                ) : (
                  'Closed'
                ),
            ],
          ]}
        />
      )}

      {active === 'leave' && (
        <RequestsTable
          title="Leave applications"
          rows={leaveRows}
          columns={[
            ['Resident', (row) => row.user?.name],
            ['Dates', (row) => `${formatDate(row.start_date)} to ${formatDate(row.end_date)}`],
            ['Reason', (row) => row.reason],
            ['Status', (row) => <StatusPill status={row.status} />],
            [
              'Actions',
              (row) =>
                row.status === 'pending' ? (
                  <ActionButtons onApprove={() => action('leave-applications', row.id, 'approve')} onReject={() => action('leave-applications', row.id, 'reject')} />
                ) : (
                  'Closed'
                ),
            ],
          ]}
        />
      )}

      {active === 'exit' && (
        <RequestsTable
          title="Exit requests"
          rows={exitRows}
          columns={[
            ['Resident', (row) => row.user?.name],
            ['Exit date', (row) => formatDate(row.requested_exit_date)],
            ['Net payable', (row) => formatMoney(row.net_payable)],
            ['Status', (row) => <StatusPill status={row.status} />],
            [
              'Actions',
              (row) =>
                row.status === 'pending' ? (
                  <ActionButtons onApprove={() => action('exit-requests', row.id, 'approve')} onReject={() => action('exit-requests', row.id, 'reject')} />
                ) : (
                  'Closed'
                ),
            ],
          ]}
        />
      )}
    </>
  )
}

function ActionButtons({ onApprove, onReject }) {
  return (
    <div className="button-row table-actions">
      <button className="primary-action slim" type="button" onClick={onApprove}>
        Approve
      </button>
      <button className="danger-action slim" type="button" onClick={onReject}>
        Reject
      </button>
    </div>
  )
}

function AdminAnnouncements({ notify }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      setRows(await apiRequest('/admin/announcements'))
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    Promise.resolve().then(() => load(false))
  }, [load])

  async function submit(event) {
    event.preventDefault()
    try {
      const data = await apiRequest('/admin/announcements', { method: 'POST', body: form })
      notify(data.message)
      setForm({ title: '', body: '', audience: 'all' })
      await load()
    } catch (error) {
      notify(fieldsFromErrors(error.errors) || error.message, 'error')
    }
  }

  async function destroy(id) {
    try {
      const data = await apiRequest(`/admin/announcements/${id}`, { method: 'DELETE', body: {} })
      notify(data.message)
      await load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  if (loading) return <LoadingBlock />

  return (
    <>
      <PageTitle title="Announcements" subtitle="Publish notices to residents." />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="Publish notice" />
          <label>
            Title
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>
          <label>
            Audience
            <select value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}>
              <option value="all">All</option>
              <option value="customers">Customers</option>
            </select>
          </label>
          <label>
            Body
            <textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows="5" required />
          </label>
          <button className="primary-action" type="submit">
            Publish
          </button>
        </form>

        <div className="panel">
          <SectionHeader title="Published notices" />
          {rows.length ? (
            <div className="item-list">
              {rows.map((item) => (
                <article className="list-item stacked" key={item.id}>
                  <div className="row-between">
                    <strong>{item.title}</strong>
                    <StatusPill status={item.audience} />
                  </div>
                  <span>{item.body}</span>
                  <div className="row-between">
                    <small>{formatDate(item.published_at)}</small>
                    <button className="text-action danger-text" type="button" onClick={() => destroy(item.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No notices" detail="Published notices will appear here." />
          )}
        </div>
      </section>
    </>
  )
}

function RequestsTable({ title, rows = [], columns }) {
  return (
    <section className="panel table-panel">
      <SectionHeader title={title} />
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map(([header]) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map(([header, render]) => (
                    <td key={header}>{render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No records" detail="Matching records will appear here." />
      )}
    </section>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type })
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4500)
  }, [])

  const defaultView = useMemo(() => (user?.role === 'admin' ? 'admin-dashboard' : 'dashboard'), [user?.role])

  useEffect(() => {
    apiRequest('/auth/me')
      .then((data) => {
        setUser(data)
        setView(data.role === 'admin' ? 'admin-dashboard' : 'dashboard')
      })
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false))
  }, [])

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST', body: {} })
    } catch {
      // Local logout still clears the UI if the session has already expired.
    } finally {
      setUser(null)
      setView('dashboard')
      notify('Logged out')
    }
  }

  function handleLogin(nextUser) {
    setUser(nextUser)
    setView(nextUser.role === 'admin' ? 'admin-dashboard' : 'dashboard')
    notify(`Welcome, ${nextUser.name}`)
  }

  function renderPage() {
    if (!user) return null

    if (user.role === 'admin') {
      if (view === 'admin-dashboard') return <AdminDashboard notify={notify} />
      if (view === 'admin-requests') return <AdminRequests notify={notify} />
      if (view === 'admin-announcements') return <AdminAnnouncements notify={notify} />
      return <ProfilePage notify={notify} onUserUpdate={setUser} />
    }

    if (view === 'dashboard') return <CustomerDashboard notify={notify} />
    if (view === 'seats') return <SeatsPage notify={notify} />
    if (view === 'rent') return <RentPage notify={notify} />
    if (view === 'leave') return <LeavePage notify={notify} />
    if (view === 'exit') return <ExitPage notify={notify} />
    if (view === 'notifications') return <NotificationsPage notify={notify} />
    if (view === 'announcements') return <AnnouncementsPage notify={notify} />
    return <ProfilePage notify={notify} onUserUpdate={setUser} />
  }

  if (checkingAuth) {
    return (
      <main className="splash">
        <LoadingBlock label="Checking session..." />
      </main>
    )
  }

  return (
    <>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      {user ? (
        <AppShell user={user} view={view || defaultView} setView={setView} onLogout={logout}>
          {renderPage()}
        </AppShell>
      ) : (
        <AuthScreen onLogin={handleLogin} notify={notify} />
      )}
    </>
  )
}

export default App


import React, { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Check,
  MapPin,
  CalendarDays,
  Instagram,
  Leaf,
  ShieldCheck,
  Ticket,
  Sparkles,
  Download
} from 'lucide-react'
import eventConfig from './config/eventConfig'

const MAP_URL =
  eventConfig.mapUrl ||
  'https://www.google.com/maps/search/?api=1&query=Senaro+Luxury+Farm+Sholayur+Palakkad+Kerala'

const VENUE_NAME = 'Senaro Luxury Farm'
const VENUE_ADDRESS = 'Sholayur, Palakkad, Kerala'

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () =>
      reject(new Error('Unable to load Razorpay Checkout. Please try again.'))

    document.body.appendChild(script)
  })

const blankMember = () => ({
  fullName: '',
  phone: '',
  email: '',
  profession: '',
  ageGroup: ''
})

const money = n =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: eventConfig.currency || 'INR',
    maximumFractionDigits: 0
  }).format(n)

function Brand() {
  return (
    <a className="brand-lockup" href="#top" aria-label="ELVORA Events home">
      <span className="brand-mark">E</span>
      <span>
        <strong>ELVORA</strong>
        <small>EVENTS</small>
      </span>
    </a>
  )
}

function App() {
  const [count, setCount] = useState(1)
  const [members, setMembers] = useState([blankMember()])
  const [agree, setAgree] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [passes, setPasses] = useState([])
  const [registrationCode, setRegistrationCode] = useState('')

  const total = useMemo(
    () => count * eventConfig.registrationAmount,
    [count]
  )

  const changeCount = next => {
    const safe = Math.max(
      1,
      Math.min(eventConfig.maxPeoplePerRegistration, Number(next) || 1)
    )

    setCount(safe)
    setMembers(prev =>
      Array.from({ length: safe }, (_, i) => prev[i] || blankMember())
    )
    setStatus({ type: '', message: '' })
  }

  const updateMember = (index, field, value) => {
    setMembers(prev =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    )
    setStatus({ type: '', message: '' })
  }

  // Opens a separate printable page for one participant's pass.
  // In the print dialog, select "Save as PDF" to download the pass.
  const downloadPass = pass => {
    const safeName = String(pass.fullName || 'Participant')
      .replace(/[<>&"']/g, '')
    const safeCode = String(pass.passCode || 'OFFSCRIPT-PASS')
      .replace(/[<>&"']/g, '')
    const safeEvent = String(eventConfig.eventName || 'ELVORA OFFSCRIPT')
      .replace(/[<>&"']/g, '')
    const safeDate = String(eventConfig.dateLabel || 'Date to be confirmed')
      .replace(/[<>&"']/g, '')
    const safeVenue = `${VENUE_NAME}, ${VENUE_ADDRESS}`

    const printableWindow = window.open('', '_blank', 'width=800,height=700')

    if (!printableWindow) {
      setStatus({
        type: 'error',
        message: 'Allow pop-ups in your browser to download the pass.'
      })
      return
    }

    printableWindow.document.open()
    printableWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeCode} - ${safeName}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 30px;
            background: #f3f1e9;
            color: #21382b;
            font-family: Arial, Helvetica, sans-serif;
          }
          .pass {
            max-width: 680px;
            margin: 30px auto;
            background: #fff;
            border: 1px solid #d6d9ce;
            border-radius: 18px;
            overflow: hidden;
          }
          .top {
            background: #21382b;
            color: #fff;
            padding: 30px;
          }
          .brand {
            font-size: 13px;
            letter-spacing: 4px;
            font-weight: bold;
          }
          h1 {
            font-size: 34px;
            margin: 22px 0 8px;
            letter-spacing: 1px;
          }
          .subtitle {
            font-size: 12px;
            letter-spacing: 2px;
            color: #e2c99b;
          }
          .content { padding: 30px; }
          .label {
            font-size: 10px;
            letter-spacing: 2px;
            color: #777;
            margin-bottom: 7px;
          }
          .name {
            font-size: 25px;
            font-weight: bold;
            margin-bottom: 25px;
            overflow-wrap: anywhere;
          }
          .code {
            padding: 15px;
            background: #f1f3ed;
            border: 1px dashed #71816e;
            border-radius: 8px;
            font-size: 19px;
            font-weight: bold;
            letter-spacing: 2px;
            overflow-wrap: anywhere;
          }
          .detail {
            padding: 15px 0;
            border-bottom: 1px solid #e5e5df;
          }
          .value { font-size: 15px; line-height: 1.6; }
          a { color: #245a3d; overflow-wrap: anywhere; }
          .note {
            margin-top: 22px;
            font-size: 11px;
            line-height: 1.7;
            color: #62665e;
          }
          @media print {
            body { padding: 0; background: #fff; }
            .pass { margin: 0 auto; box-shadow: none; }
            a { color: #245a3d; }
          }
        </style>
      </head>
      <body>
        <article class="pass">
          <header class="top">
            <div class="brand">ELVORA EVENTS PRESENTS</div>
            <h1>OFFSCRIPT</h1>
            <div class="subtitle">FARMSTAY SOCIAL MEET · ENTRY PASS</div>
          </header>
          <section class="content">
            <div class="label">PARTICIPANT NAME</div>
            <div class="name">${safeName}</div>

            <div class="label">UNIQUE PASS CODE</div>
            <div class="code">${safeCode}</div>

            <div class="detail">
              <div class="label">EVENT DATE</div>
              <div class="value">${safeDate}</div>
            </div>

            <div class="detail">
              <div class="label">VENUE</div>
              <div class="value">${safeVenue}</div>
            </div>

            <div class="detail">
              <div class="label">GOOGLE MAPS DIRECTIONS</div>
              <div class="value">
                <a href="${MAP_URL}">${MAP_URL}</a>
              </div>
            </div>

            <p class="note">
              Keep this pass ready for entry. Each participant must use
              their own pass code. This pass confirms entry only after
              successful payment verification by the event registration system.
            </p>
          </section>
        </article>
        <script>
          window.onload = () => {
            setTimeout(() => window.print(), 400);
          };
        </script>
      </body>
      </html>
    `)
    printableWindow.document.close()
  }

  const submit = async e => {
    e.preventDefault()
    setStatus({ type: '', message: '' })

    if (!agree) {
      setStatus({
        type: 'error',
        message: 'Please accept the event terms before continuing.'
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const invalid = members.some(
      member =>
        !member.fullName.trim() ||
        !/^[6-9]\d{9}$/.test(member.phone.trim()) ||
        !emailRegex.test(member.email.trim()) ||
        !member.profession.trim() ||
        !member.ageGroup
    )

    if (invalid) {
      setStatus({
        type: 'error',
        message:
          'Please complete every field for each participant. Use a valid 10-digit Indian mobile number and email address.'
      })
      return
    }

    if (!eventConfig.submitToBackend) {
      setStatus({
        type: 'error',
        message: 'Backend registration and payment must be enabled first.'
      })
      return
    }

    setSubmitting(true)

    try {
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantCount: count,
          participants: members
        })
      })

      const orderData = await orderResponse.json().catch(() => ({}))

      if (!orderResponse.ok) {
        throw new Error(
          orderData.message || 'Unable to create payment order.'
        )
      }

      if (!orderData.keyId || !orderData.orderId || !orderData.registrationId) {
        throw new Error('The server returned incomplete payment information.')
      }

      await loadRazorpay()

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: eventConfig.brand || 'ELVORA EVENTS',
        description: `${count} participant${count > 1 ? 's' : ''} - ${eventConfig.eventName}`,
        order_id: orderData.orderId,
        prefill: {
          name: members[0].fullName,
          email: members[0].email,
          contact: members[0].phone
        },
        notes: {
          registration_code: orderData.registrationCode
        },
        theme: { color: '#244633' },

        handler: async paymentResponse => {
          setStatus({
            type: '',
            message: 'Payment submitted. Verifying securely...'
          })

          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                registrationId: orderData.registrationId,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature
              })
            })

            const verifyData = await verifyResponse.json().catch(() => ({}))

            if (!verifyResponse.ok || !verifyData.verified) {
              setStatus({
                type: 'error',
                message:
                  `${verifyData.message || 'Payment verification is not complete.'} ` +
                  `Keep registration code ${orderData.registrationCode} and contact the event team before trying to pay again.`
              })
              return
            }

            const confirmedPasses = Array.isArray(verifyData.passes)
              ? verifyData.passes.map((pass, index) => ({
                  fullName: pass.fullName || members[index]?.fullName || 'Participant',
                  passCode: pass.passCode || '',
                  participantOrder: pass.participantOrder || index + 1
                }))
              : []

            setPasses(confirmedPasses)
            setRegistrationCode(
              verifyData.registrationCode || orderData.registrationCode || ''
            )

            setStatus({
              type: 'success',
              message:
                `Payment verified! Your registration is confirmed. ` +
                `Registration code: ${verifyData.registrationCode || orderData.registrationCode}.`
            })

            setTimeout(() => {
              document.getElementById('entry-passes')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              })
            }, 150)
          } catch {
            setStatus({
              type: 'error',
              message:
                `We could not confirm the payment status yet. ` +
                `Keep registration code ${orderData.registrationCode} and contact the event team before retrying.`
            })
          }
        },

        modal: {
          ondismiss: () => {
            setStatus({
              type: 'error',
              message:
                `Checkout was closed. Your registration remains pending ` +
                `and is not confirmed. Reference: ${orderData.registrationCode}.`
            })
          }
        }
      }

      const checkout = new window.Razorpay(options)

      checkout.on('payment.failed', response => {
        setStatus({
          type: 'error',
          message:
            response.error?.description ||
            'Payment failed. Your registration has not been confirmed.'
        })
      })

      checkout.open()
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Unable to start payment. Please try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="top">
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="d-none d-md-flex">
            <a href="#story">Our story</a>
            <a href="#experience">The experience</a>
            <a href="#location">Location</a>
          </nav>
          <a className="header-cta" href="#register">
            Reserve your spot <ArrowRight size={15} />
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-shade"></div>
        <div className="container hero-content">
          <div className="eyebrow">
            <span className="eyebrow-line"></span>
            {eventConfig.brand} PRESENTS
            <span className="eyebrow-line"></span>
          </div>
          <p className="hero-kicker">A different kind of day out</p>
          <h1>
            {eventConfig.eventName.split(' ').slice(0, -1).join(' ')}
            <br />
            <em>{eventConfig.eventName.split(' ').slice(-1)}</em>
          </h1>
          <p className="hero-subtitle">{eventConfig.subtitle}</p>
          <p className="hero-copy">
            Leave the routine behind. Find your people.
            <br className="d-none d-sm-block" /> Make a day out of the unexpected.
          </p>
          <div className="hero-meta">
            <span>
              <MapPin size={16} /> {eventConfig.location}
            </span>
            <span>
              <CalendarDays size={16} /> {eventConfig.dateLabel}
            </span>
          </div>
          <a className="primary-button" href="#story">
            Explore the experience <ArrowDown size={17} />
          </a>
        </div>
        <div className="hero-bottom-note">
          <span>PEOPLE</span><i>•</i><span>PLAY</span><i>•</i>
          <span>FOOD</span><i>•</i><span>NATURE</span>
        </div>
      </section>

      <section className="intro-section section-pad" id="story">
        <div className="container">
          <div className="section-kicker">
            <Leaf size={16} /> THE ELVORA WAY
          </div>
          <div className="row g-4 align-items-end">
            <div className="col-lg-7">
              <h2>Who are <em>we?</em></h2>
            </div>
            <div className="col-lg-5">
              <p className="intro-copy">
                We’re ELVORA EVENTS — creating thoughtfully curated experiences
                that bring people together. Not another routine outing. A
                welcoming space to meet new faces, try something different and
                leave with stories worth sharing.
              </p>
            </div>
          </div>
          <div className="statement-line">
            <span>GOOD PEOPLE.</span>
            <span>GOOD ENERGY.</span>
            <span>REAL CONNECTIONS.</span>
          </div>
        </div>
      </section>

      <section className="experience-section section-pad" id="experience">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="section-kicker">
                <Sparkles size={16} /> WHAT'S IN STORE
              </div>
              <h2>A day full of <em>possibilities.</em></h2>
            </div>
            <p>Come for the experience. Stay for the people you meet.</p>
          </div>
          <div className="activity-grid">
            {eventConfig.activities.map((item, i) => (
              <article className="activity-card" key={item.title}>
                <div className="activity-number">0{i + 1}</div>
                <div className="activity-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <p className="fine-print">
            Activities are subject to resort availability, safety requirements
            and final event arrangements.
          </p>
        </div>
      </section>

      <section className="gallery-section section-pad">
        <div className="container">
          <div className="section-kicker">
            <Leaf size={16} /> OUT OF OFFICE. INTO NATURE.
          </div>
          <div className="section-heading">
            <h2>Your kind of <em>escape.</em></h2>
            <p>A little nature, a little play, a lot of good company.</p>
          </div>
          <div className="photo-grid">
            {eventConfig.resortPhotos.map((photo, i) => (
              <article className={`photo-card photo-${i + 1}`} key={photo.title}>
                <img src={photo.url} alt={photo.title} loading="lazy" />
                <div className="photo-overlay">
                  <span>0{i + 1} / THE EXPERIENCE</span>
                  <h3>{photo.title}</h3>
                  <p>{photo.text}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="fine-print">
            Ensure published photographs accurately represent the venue and
            facilities available for this event.
          </p>
        </div>
      </section>

      {/* LOCATION SECTION */}
      <section className="location-section section-pad" id="location">
        <div className="container location-panel">
          <div className="location-copy">
            <div className="section-kicker">
              <MapPin size={16} /> THE GETAWAY
            </div>
            <h2>
              Meet us at <em>Senaro Luxury Farm.</em>
            </h2>
            <p>
              Leave the routine behind and join ELVORA OFFSCRIPT for a farmstay
              social experience surrounded by nature. Open Google Maps for
              directions to the venue.
            </p>

            <div className="location-detail">
              <MapPin size={18} />
              <span>
                <strong>{VENUE_NAME}</strong>
                <small>{VENUE_ADDRESS}</small>
              </span>
            </div>

            <div className="location-detail">
              <CalendarDays size={18} />
              <span>
                <strong>{eventConfig.dateLabel}</strong>
                <small>{eventConfig.timeLabel}</small>
              </span>
            </div>

            <a
              href={MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '24px',
                textDecoration: 'none'
              }}
            >
              <MapPin size={18} />
              Get Directions
              <ArrowRight size={16} />
            </a>
          </div>

          <div className="location-image">
            <div className="location-image-caption">
              A change of scene.
              <br />
              <em>A chance to connect.</em>
            </div>
          </div>
        </div>
      </section>

      {/* REGISTRATION SECTION */}
      <section className="register-section section-pad" id="register">
        <div className="container">
          <div className="register-heading">
            <div className="section-kicker">
              <Ticket size={16} /> YOUR NEXT STORY STARTS HERE
            </div>
            <h2>Save your <em>place.</em></h2>
            <p>
              Register solo or bring your circle. One registration can include
              up to {eventConfig.maxPeoplePerRegistration} people.
            </p>
          </div>

          <div className="registration-layout">
            <aside className="price-card">
              <div className="price-label">FARMSTAY SOCIAL MEET</div>
              <div className="price-amount">
                {money(eventConfig.registrationAmount)}
                <small> / person</small>
              </div>
              <div className="price-divider"></div>
              <ul>
                <li><Check size={16} /> Farmstay social experience</li>
                <li><Check size={16} /> Activities listed above</li>
                <li><Check size={16} /> Lunch as per final event menu</li>
                <li><Check size={16} /> A chance to meet new people</li>
              </ul>
              <div className="price-note">
                <ShieldCheck size={16} /> Please review the final event details
                before making payment.
              </div>
            </aside>

            <form className="registration-form" onSubmit={submit}>
              <div className="form-topline">
                <span>REGISTRATION DETAILS</span>
                <span>STEP 01 / 01</span>
              </div>

              <label className="field-label" htmlFor="participantCount">
                How many people are you registering?
              </label>

              <div className="count-picker">
                {[1, 2, 3, 4]
                  .filter(n => n <= eventConfig.maxPeoplePerRegistration)
                  .map(n => (
                    <button
                      type="button"
                      className={count === n ? 'count-option active' : 'count-option'}
                      onClick={() => changeCount(n)}
                      key={n}
                      aria-pressed={count === n}
                    >
                      <strong>{n}</strong>
                      <small>{n === 1 ? 'Person' : 'People'}</small>
                    </button>
                  ))}
              </div>

              {members.map((member, index) => (
                <div className="participant-block" key={index}>
                  <div className="participant-title">
                    <span>PARTICIPANT {String(index + 1).padStart(2, '0')}</span>
                    {index === 0 && (
                      <span className="primary-contact">PRIMARY CONTACT</span>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="field-label" htmlFor={`name-${index}`}>
                        Full name *
                      </label>
                      <input
                        id={`name-${index}`}
                        className="form-control cinematic-input"
                        autoComplete="name"
                        value={member.fullName}
                        onChange={e => updateMember(index, 'fullName', e.target.value)}
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="field-label" htmlFor={`phone-${index}`}>
                        Mobile number *
                      </label>
                      <input
                        id={`phone-${index}`}
                        className="form-control cinematic-input"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        pattern="[6-9][0-9]{9}"
                        value={member.phone}
                        onChange={e =>
                          updateMember(index, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        placeholder="10-digit mobile number"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="field-label" htmlFor={`email-${index}`}>
                        Email address *
                      </label>
                      <input
                        id={`email-${index}`}
                        className="form-control cinematic-input"
                        type="email"
                        autoComplete="email"
                        value={member.email}
                        onChange={e => updateMember(index, 'email', e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <div className="col-md-7">
                      <label className="field-label" htmlFor={`profession-${index}`}>
                        Profession / what do you do? *
                      </label>
                      <input
                        id={`profession-${index}`}
                        className="form-control cinematic-input"
                        value={member.profession}
                        onChange={e => updateMember(index, 'profession', e.target.value)}
                        placeholder="e.g. Designer, Student, Entrepreneur"
                        required
                      />
                    </div>

                    <div className="col-md-5">
                      <label className="field-label" htmlFor={`age-${index}`}>
                        Age group * (21+ only)
                      </label>
                      <select
                        id={`age-${index}`}
                        className="form-select cinematic-input"
                        value={member.ageGroup}
                        onChange={e => updateMember(index, 'ageGroup', e.target.value)}
                        required
                      >
                        <option value="">Select age group</option>
                        {eventConfig.ageGroups.map(age => (
                          <option key={age} value={age}>{age}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <div className="total-row">
                <div>
                  <span>REGISTRATION TOTAL</span>
                  <small>
                    {count} {count === 1 ? 'participant' : 'participants'} ×{' '}
                    {money(eventConfig.registrationAmount)}
                  </small>
                </div>
                <strong>{money(total)}</strong>
              </div>

              <label className="terms-check">
                <input
                  type="checkbox"
                  checked={agree}
                  required
                  onChange={e => setAgree(e.target.checked)}
                />
                <span>
                  I confirm the details are accurate, all participants meet the
                  21+ age requirement, and I agree to the event terms and privacy notice.
                </span>
              </label>

              {status.message && (
                <div className={`form-status ${status.type}`} role="status">
                  {status.message}
                </div>
              )}

              <button
                className="submit-button"
                type="submit"
                disabled={submitting || !agree}
              >
                {submitting ? 'Processing…' : 'Pay and register'}
                <ArrowRight size={17} />
              </button>

              <p className="secure-note">
                <ShieldCheck size={14} /> Payments are verified securely by the server.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* INDIVIDUAL ENTRY PASSES: shown only after verified payment */}
      {passes.length > 0 && (
        <section
          className="section-pad"
          id="entry-passes"
          style={{ background: '#f5f3ec' }}
        >
          <div className="container">
            <div className="section-kicker">
              <Ticket size={16} /> YOUR ENTRY PASSES
            </div>
            <h2>
              Your place is <em>confirmed.</em>
            </h2>
            <p>
              Registration reference: <strong>{registrationCode}</strong>
            </p>
            <p>
              Download each participant's pass separately and save it as a PDF.
              The Google Maps link is included on every pass.
            </p>

            <div className="row g-4 mt-2">
              {passes.map((pass, index) => (
                <div className="col-12 col-md-6" key={pass.passCode || index}>
                  <article
                    style={{
                      height: '100%',
                      background: '#fff',
                      border: '1px solid #d9ded4',
                      borderRadius: '16px',
                      padding: '24px',
                      color: '#21382b'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '20px'
                      }}
                    >
                      <span style={{ fontSize: '12px', letterSpacing: '2px' }}>
                        ELVORA EVENTS
                      </span>
                      <Ticket size={22} />
                    </div>

                    <h3 style={{ marginBottom: '6px' }}>OFFSCRIPT</h3>
                    <p style={{ fontSize: '12px', letterSpacing: '1px' }}>
                      PARTICIPANT {String(pass.participantOrder || index + 1).padStart(2, '0')}
                    </p>

                    <div style={{ marginTop: '22px' }}>
                      <small>PARTICIPANT NAME</small>
                      <h4 style={{ overflowWrap: 'anywhere' }}>
                        {pass.fullName}
                      </h4>
                    </div>

                    <div
                      style={{
                        background: '#f1f3ed',
                        border: '1px dashed #9aa894',
                        borderRadius: '8px',
                        padding: '14px',
                        marginTop: '16px'
                      }}
                    >
                      <small>UNIQUE PASS CODE</small>
                      <div style={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}>
                        {pass.passCode || 'Pass code unavailable — contact event team'}
                      </div>
                    </div>

                    <div style={{ marginTop: '18px', lineHeight: 1.8 }}>
                      <div>
                        <CalendarDays size={15} style={{ marginRight: '8px' }} />
                        {eventConfig.dateLabel}
                      </div>
                      <div>
                        <MapPin size={15} style={{ marginRight: '8px' }} />
                        {VENUE_NAME}, {VENUE_ADDRESS}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <a href={MAP_URL} target="_blank" rel="noopener noreferrer">
                          Open venue in Google Maps
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="submit-button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '100%',
                        marginTop: '22px'
                      }}
                      onClick={() => downloadPass(pass)}
                      disabled={!pass.passCode}
                    >
                      <Download size={17} />
                      Download Pass / Save PDF
                    </button>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <div className="container footer-inner">
          <Brand />
          <div className="footer-center">
            MAKE ROOM FOR NEW STORIES.
            <br />
            <span>PEOPLE • PLAY • FOOD • NATURE</span>
          </div>
          <a
            className="instagram-link"
            href="https://www.instagram.com/elvora_eventss/"
            target="_blank"
            rel="noreferrer"
          >
            <Instagram size={18} /> @elvora_eventss
          </a>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} ELVORA EVENTS. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </main>
  )
}

export default App

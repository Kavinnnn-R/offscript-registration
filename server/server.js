
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'
import Razorpay from 'razorpay'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = Number(process.env.PORT || 5000)
const projectRoot = path.resolve(__dirname, '..')
const distPath = path.join(projectRoot, 'dist')

app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: '100kb' }))

app.use(
  '/api/payments',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  })
)

app.use(
  '/api/registrations',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  })
)

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_KEY'
]

const missing = required.filter(key => !process.env[key])

let supabase = null
let razorpay = null

if (missing.length === 0) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
} else {
  console.warn(
    `Missing server environment variables: ${missing.join(', ')}`
  )
}

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  })
} else {
  console.warn(
    'Razorpay credentials are missing. Payment endpoints are disabled.'
  )
}

const failSetup = res =>
  res.status(503).json({
    message: 'Backend is not configured. Check server/.env.'
  })

const adminAuth = (req, res, next) => {
  const supplied = String(req.get('x-admin-key') || '')
  const expected = String(process.env.ADMIN_KEY || '')

  const suppliedBuffer = Buffer.from(supplied)
  const expectedBuffer = Buffer.from(expected)

  if (
    !expected ||
    suppliedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ message: 'Invalid admin key.' })
  }

  next()
}

const clean = value =>
  typeof value === 'string' ? value.trim() : ''

const phoneRegex = /^[6-9]\d{9}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const allowedAgeGroups = new Set(['21–27', '28–34', '35–40'])

const paymentSetup = res => {
  if (!supabase) {
    failSetup(res)
    return false
  }

  if (!razorpay) {
    res.status(503).json({
      message: 'Razorpay is not configured. Check server/.env.'
    })
    return false
  }

  return true
}

function normalizeParticipants(body, maxParticipants = 4) {
  const participants = Array.isArray(body?.participants)
    ? body.participants
    : []

  if (
    participants.length < 1 ||
    participants.length > Math.min(4, maxParticipants) ||
    Number(body?.participantCount) !== participants.length
  ) {
    return {
      error: 'A registration must contain 1 to 4 participants.'
    }
  }

  const normalized = participants.map((p, i) => ({
    name: clean(p.fullName),
    phone: clean(p.phone),
    email: clean(p.email).toLowerCase(),
    profession: clean(p.profession),
    age: clean(p.ageGroup),
    participant_order: i + 1
  }))

  for (const p of normalized) {
    if (
      !p.name ||
      !phoneRegex.test(p.phone) ||
      !emailRegex.test(p.email) ||
      !p.profession ||
      !allowedAgeGroups.has(p.age)
    ) {
      return {
        error:
          'Please provide valid details for every participant. Participants must be 21+.'
      }
    }
  }

  return { participants: normalized }
}

async function getOpenEvent(res) {
  const { data: event, error } = await supabase
    .from('event_settings')
    .select(
      'event_name,location,ticket_price,registration_open,max_people_per_registration'
    )
    .eq('id', 1)
    .single()

  if (error || !event) {
    console.error('Event settings query failed:', error?.message)
    res.status(500).json({
      message: 'Event settings are not configured.'
    })
    return null
  }

  if (!event.registration_open) {
    res.status(403).json({
      message: 'Registrations are currently closed.'
    })
    return null
  }

  return event
}

function createRegistrationCode() {
  return `ELV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

function createPassCode() {
  return `OFF-${crypto.randomBytes(6).toString('hex').toUpperCase()}`
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'OFFSCRIPT registration API',
    razorpayConfigured: Boolean(razorpay)
  })
})

app.get('/api/event', async (_req, res) => {
  if (!supabase) return failSetup(res)

  try {
    const { data, error } = await supabase
      .from('event_settings')
      .select(
        'event_name,location,event_date,ticket_price,max_people_per_registration,registration_open'
      )
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      console.error('Event settings query failed:', error.message)
      return res.status(500).json({
        message: 'Unable to load event information.'
      })
    }

    if (!data) {
      return res.status(500).json({
        message: 'Add the event_settings row using schema.sql.'
      })
    }

    return res.json(data)
  } catch (error) {
    console.error('Event endpoint failed:', error.message)
    return res.status(500).json({
      message: 'Unable to load event information.'
    })
  }
})

/*
 * Create a Razorpay order and a pending registration.
 * A pending registration is NOT a confirmed registration.
 */
app.post('/api/payments/create-order', async (req, res) => {
  if (!paymentSetup(res)) return

  let createdRegistrationId = null

  try {
    const event = await getOpenEvent(res)
    if (!event) return

    const result = normalizeParticipants(
      req.body,
      event.max_people_per_registration || 4
    )

    if (result.error) {
      return res.status(400).json({ message: result.error })
    }

    const participants = result.participants
    const ticketPrice = Number(event.ticket_price)

    if (!Number.isSafeInteger(ticketPrice) || ticketPrice <= 0) {
      return res.status(500).json({
        message: 'The event ticket price is invalid.'
      })
    }

    const amountPaise = ticketPrice * 100 * participants.length

    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({
        message: 'The payment amount is invalid.'
      })
    }

    const registrationCode = createRegistrationCode()

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: registrationCode,
      notes: {
        registration_code: registrationCode,
        event_name: String(event.event_name).slice(0, 200)
      }
    })

    const { data: registration, error: registrationError } =
      await supabase
        .from('registrations')
        .insert({
          registration_code: registrationCode,
          event_name: event.event_name,
          member_count: participants.length,
          amount: amountPaise / 100,
          currency: 'INR',
          payment_status: 'pending',
          registration_status: 'pending',
          razorpay_order_id: order.id
        })
        .select(
          'id,registration_code,member_count,amount,currency,payment_status,registration_status'
        )
        .single()

    if (registrationError || !registration) {
      console.error(
        'Pending registration insert failed:',
        registrationError?.message
      )

      return res.status(500).json({
        message: 'Could not start registration. Please try again.'
      })
    }

    createdRegistrationId = registration.id

    // Generate one unique pass code per attendee.
    // Do not deliver these codes as valid passes until payment is verified.
    const attendeeRows = participants.map(p => ({
      ...p,
      registration_id: registration.id,
      pass_code: createPassCode()
    }))

    const { error: attendeeError } = await supabase
      .from('attendees')
      .insert(attendeeRows)

    if (attendeeError) {
      console.error(
        'Pending attendees insert failed:',
        attendeeError.message
      )

      await supabase
        .from('registrations')
        .delete()
        .eq('id', registration.id)
        .eq('payment_status', 'pending')

      return res.status(500).json({
        message: 'Could not save participant details. Please try again.'
      })
    }

    return res.status(201).json({
      message: 'Payment order created. Complete checkout to confirm registration.',
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      registrationId: registration.id,
      registrationCode: registration.registration_code,
      participantCount: registration.member_count,
      amountDue: registration.amount
    })
  } catch (error) {
    console.error('Create payment order failed:', error.message)

    // Only remove a still-pending registration if this request failed.
    // Never delete a paid registration here.
    if (createdRegistrationId && supabase) {
      try {
        await supabase
          .from('registrations')
          .delete()
          .eq('id', createdRegistrationId)
          .eq('payment_status', 'pending')
      } catch (cleanupError) {
        console.error('Pending cleanup failed:', cleanupError.message)
      }
    }

    return res.status(500).json({
      message: 'Could not start payment. Please try again.'
    })
  }
})

/*
 * Verify Razorpay signature and independently fetch the payment.
 * Only captured payments can confirm a registration.
 */
app.post('/api/payments/verify', async (req, res) => {
  if (!paymentSetup(res)) return

  try {
    const registrationId = clean(req.body?.registrationId)
    const orderId = clean(req.body?.razorpay_order_id)
    const paymentId = clean(req.body?.razorpay_payment_id)
    const signature = clean(req.body?.razorpay_signature)

    if (!registrationId || !orderId || !paymentId || !signature) {
      return res.status(400).json({
        message: 'Missing payment verification details.'
      })
    }

    const { data: registration, error: registrationError } =
      await supabase
        .from('registrations')
        .select(
          'id,registration_code,amount,currency,payment_status,registration_status,razorpay_order_id,razorpay_payment_id'
        )
        .eq('id', registrationId)
        .maybeSingle()

    if (registrationError || !registration) {
      return res.status(404).json({
        message: 'Registration was not found.'
      })
    }

    if (registration.razorpay_order_id !== orderId) {
      return res.status(400).json({
        message: 'Payment order does not match this registration.'
      })
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    const receivedBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.status(400).json({
        message: 'Payment signature verification failed.'
      })
    }

    // Check the actual payment at Razorpay; do not trust browser status.
    const payment = await razorpay.payments.fetch(paymentId)

    if (
      payment.order_id !== orderId ||
      Number(payment.amount) !== Math.round(Number(registration.amount) * 100) ||
      payment.currency !== registration.currency
    ) {
      return res.status(400).json({
        message: 'Payment details do not match the registration.'
      })
    }

    if (payment.status !== 'captured') {
      return res.status(409).json({
        verified: false,
        paymentStatus: payment.status,
        message:
          'Payment has not been captured yet. The registration is not confirmed.'
      })
    }

    // Idempotent success response for a payment already verified.
    if (registration.payment_status === 'paid') {
      if (registration.razorpay_payment_id !== paymentId) {
        return res.status(409).json({
          message: 'This registration is already associated with another payment.'
        })
      }

      const { data: existingAttendees, error: attendeeReadError } =
        await supabase
          .from('attendees')
          .select(
            'pass_code,name,participant_order'
          )
          .eq('registration_id', registration.id)
          .order('participant_order', { ascending: true })

      if (attendeeReadError) {
        console.error('Pass lookup failed:', attendeeReadError.message)
        return res.status(500).json({
          message: 'Payment is confirmed, but passes could not be loaded. Contact support with your registration code.'
        })
      }

      return res.json({
        verified: true,
        registrationCode: registration.registration_code,
        paymentStatus: 'paid',
        registrationStatus: 'confirmed',
        passes: (existingAttendees || []).map(a => ({
          passCode: a.pass_code,
          fullName: a.name,
          participantOrder: a.participant_order
        })),
        message: 'Payment was already verified.'
      })
    }

    const { data: updated, error: updateError } = await supabase
      .from('registrations')
      .update({
        payment_status: 'paid',
        registration_status: 'confirmed',
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      })
      .eq('id', registration.id)
      .eq('razorpay_order_id', orderId)
      .neq('payment_status', 'paid')
      .select('id,registration_code,payment_status,registration_status')
      .maybeSingle()

    if (updateError) {
      console.error('Payment status update failed:', updateError.message)
      return res.status(500).json({
        message: 'Payment was verified, but the registration update failed. Contact support with your registration code.'
      })
    }

    let confirmedRegistration = updated

    // Handle simultaneous verification requests safely.
    if (!confirmedRegistration) {
      const { data: latest, error: latestError } = await supabase
        .from('registrations')
        .select(
          'id,registration_code,payment_status,registration_status,razorpay_payment_id'
        )
        .eq('id', registration.id)
        .maybeSingle()

      if (
        latestError ||
        latest?.payment_status !== 'paid' ||
        latest?.razorpay_payment_id !== paymentId
      ) {
        return res.status(409).json({
          message: 'Registration status changed. Please contact support.'
        })
      }

      confirmedRegistration = latest
    }

    const { data: attendees, error: attendeesError } = await supabase
      .from('attendees')
      .select('pass_code,name,participant_order')
      .eq('registration_id', registration.id)
      .order('participant_order', { ascending: true })

    if (attendeesError || !attendees) {
      console.error(
        'Confirmed registration pass lookup failed:',
        attendeesError?.message
      )

      return res.status(500).json({
        verified: true,
        registrationCode: registration.registration_code,
        paymentStatus: 'paid',
        registrationStatus: 'confirmed',
        message: 'Payment is confirmed, but pass details could not be loaded. Contact support with your registration code.'
      })
    }

    return res.json({
      verified: true,
      registrationCode: confirmedRegistration.registration_code,
      paymentStatus: 'paid',
      registrationStatus: 'confirmed',
      passes: attendees.map(a => ({
        passCode: a.pass_code,
        fullName: a.name,
        participantOrder: a.participant_order
      })),
      message: 'Payment verified. Registration confirmed.'
    })
  } catch (error) {
    console.error('Payment verification failed:', error.message)

    return res.status(500).json({
      message: 'Unable to verify payment right now. Do not retry payment repeatedly; check your transaction status first.'
    })
  }
})

// Private admin API: registration and attendee information.
app.get('/api/admin/registrations', adminAuth, async (req, res) => {
  if (!supabase) return failSetup(res)

  try {
    const limit = Math.min(
      500,
      Math.max(1, Number(req.query.limit) || 200)
    )

    const { data, error } = await supabase
      .from('registrations')
      .select(
        'id,registration_code,event_name,member_count,amount,currency,payment_status,registration_status,razorpay_order_id,razorpay_payment_id,created_at,attendees(id,name,phone,email,profession,age,participant_order,pass_code)'
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Admin registrations query failed:', error.message)
      return res.status(500).json({
        message: 'Unable to load registrations.'
      })
    }

    return res.json({ registrations: data || [] })
  } catch (error) {
    console.error('Admin registrations failed:', error.message)
    return res.status(500).json({
      message: 'Unable to load registrations.'
    })
  }
})

app.get('/api/admin/summary', adminAuth, async (_req, res) => {
  if (!supabase) return failSetup(res)

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select(
        'id,member_count,amount,payment_status,registration_status'
      )

    if (error) {
      console.error('Admin summary query failed:', error.message)
      return res.status(500).json({
        message: 'Unable to load summary.'
      })
    }

    const rows = data || []
    const paidRows = rows.filter(r => r.payment_status === 'paid')

    return res.json({
      registrations: rows.length,
      participants: rows.reduce(
        (sum, r) => sum + Number(r.member_count || 0),
        0
      ),
      paidRegistrations: paidRows.length,
      paidParticipants: paidRows.reduce(
        (sum, r) => sum + Number(r.member_count || 0),
        0
      ),
      totalPaidAmount: paidRows.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      ),
      pendingAmount: rows
        .filter(r => r.payment_status === 'pending')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    })
  } catch (error) {
    console.error('Admin summary failed:', error.message)
    return res.status(500).json({
      message: 'Unable to load summary.'
    })
  }
})

// Production: serve the Vite frontend and other static assets.
app.use(express.static(distPath))

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()

  res.sendFile(path.join(distPath, 'index.html'), error => {
    if (error) next()
  })
})

app.listen(PORT, () => {
  console.log(`OFFSCRIPT server listening on http://localhost:${PORT}`)
})

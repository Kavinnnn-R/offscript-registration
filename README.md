# ELVORA OFFGRID — Registration + Private Admin Dashboard

## What this package does
- Cinematic, responsive event page
- Participant registration for 1–4 people
- Stores registration and attendee details in Supabase through Express API
- Server-calculated amount due
- Private `/admin` dashboard for phone or computer
- Search registrations by name, phone, email or registration code
- Registration summary and CSV export
- Razorpay intentionally not connected yet; registrations are saved with `payment_status = pending`

## 1. Requirements
Node.js 18+ and a Supabase project.

## 2. Configure Supabase
1. Open Supabase Dashboard > SQL Editor.
2. Run `supabase/schema.sql`.
3. Copy `server/.env.example` to `server/.env`.
4. Fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a long random `ADMIN_KEY`.
5. Never put the service role key or admin key in frontend `VITE_*` variables or commit `server/.env` to Git.

The service role key is powerful and must stay on the server only.

## 3. Install and run locally
```bash
npm install
npm run dev
```
In a second terminal:
```bash
npm run server
```
Frontend runs at `http://localhost:5173`; API requests are proxied to `http://localhost:5000`.

## 4. Use the dashboard on your phone
Locally, your phone cannot reach `localhost` on your PC as a public web link. For a usable link anywhere, deploy the project to a hosting provider that supports a Node/Express server and persistent environment variables. Build command: `npm run build`; start command: `npm start`; service port: use `PORT` supplied by host. The Express server serves the built frontend and API from the same domain.
Then open `https://YOUR-DEPLOYED-DOMAIN/admin` on your phone and enter `ADMIN_KEY`.

For temporary same-Wi-Fi testing, run Vite with `--host 0.0.0.0` and server bound to your LAN interface, but do not expose this setup publicly. Use HTTPS deployment for real personal data.

## 5. Change event details and price
- Update the page's display content in `src/config/eventConfig.js`.
- Update the server-side source of truth in Supabase `event_settings`:
```sql
update public.event_settings
set event_name = 'ELVORA OFFGRID',
    location = 'Anaikatti, Tamil Nadu',
    event_date = 'DATE ANNOUNCEMENT COMING SOON',
    ticket_price = 999,
    max_people_per_registration = 4,
    registration_open = true,
    updated_at = now()
where id = 1;
```
Change `ticket_price` to the confirmed price. The server calculates the amount itself; it does not trust the browser's total.

## 6. Payment is for a later phase
No Razorpay order is created and no payment is collected by this version. After registration, the record stays `pending`.
When ready, implement a server endpoint to create Razorpay orders, use the server-only Razorpay secret, verify the checkout signature server-side, and update payment status only after verified confirmation/webhook. Never mark a payment paid based only on a browser response.

## Security and limitations
- Admin API uses an `x-admin-key` header. The key is held in `sessionStorage` for the current browser tab/session.
- Use a long random admin key, HTTPS, and do not share the admin link/key publicly.
- This starter does not include admin user accounts, email OTP, seat inventory/locking, duplicate-registration prevention, payment integration or automatic refunds.
- The schema currently uses a placeholder ticket price of ₹999. Confirm price, date, venue and inclusions before opening registration.
- Resort photos are visual references, not confirmed photos of the selected Anaikatti resort.

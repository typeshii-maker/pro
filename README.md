# Thrifter — Thrift Clothing E-commerce (Full Stack)

A mobile-friendly thrift clothing storefront with a beige & black palette, a blurred
fashion hero, categorized Men's / Women's / Children's racks, wishlist, customer
reviews, and **M-Pesa STK Push** checkout via the Safaricom Daraja API.

```
thrifter/
├── frontend/           Bootstrap 5 site (HTML/CSS/JS, no build step)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── backend/             Node + Express API
    ├── server.js
    ├── routes/
    │   ├── products.js
    │   ├── reviews.js
    │   └── mpesa.js      ← Daraja STK Push integration
    ├── data/
    │   ├── products.json
    │   └── reviews.json
    ├── package.json
    └── .env.example
```

## 1. Run the backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` | Create a free app at [developer.safaricom.co.ke](https://developer.safaricom.co.ke) → "My Apps" |
| `MPESA_SHORTCODE` / `MPESA_PASSKEY` | Use Safaricom's published sandbox shortcode `174379` and the sandbox passkey from the Daraja docs while testing. Swap for your real Paybill/Till shortcode and passkey when you go live. |
| `MPESA_CALLBACK_URL` | Must be a **public HTTPS URL** Safaricom can reach. In development, run `ngrok http 4000` and use the generated URL + `/api/mpesa/callback`. |

Start the API:

```bash
npm start          # http://localhost:4000
```

## 2. Run the frontend

The frontend is static — no build step. Easiest options:

- **VS Code**: install the "Live Server" extension, right-click `frontend/index.html` → "Open with Live Server".
- **Python**: `cd frontend && python3 -m http.server 5500`, then open `http://localhost:5500`.

By default `frontend/js/app.js` calls the API at `http://localhost:4000/api`. If the
backend isn't running, the page still works using built-in sample data, but checkout,
live reviews, and product data won't be real — start the backend to make the site fully
functional.

If your frontend runs on a different port than `http://localhost:5500`, update
`FRONTEND_ORIGIN` in `backend/.env` so CORS allows it.

## 3. How the M-Pesa flow works

1. Shopper adds items to the bag and opens the cart drawer.
2. They enter an M-Pesa phone number and tap **Pay with M-Pesa**.
3. The frontend calls `POST /api/mpesa/stkpush`, which asks Safaricom to push a PIN
   prompt to that phone (`STK Push`).
4. The shopper enters their M-Pesa PIN on their phone.
5. Safaricom calls your `MPESA_CALLBACK_URL` (`POST /api/mpesa/callback`) with the
   result. The backend stores it in memory against the `CheckoutRequestID`.
6. The frontend polls `GET /api/mpesa/status/:checkoutRequestID` every few seconds
   until it sees `success` or `failed`, and updates the UI.

Swap the in-memory `transactions` Map in `routes/mpesa.js` for a real database
(MongoDB, Postgres, etc.) before going to production, and persist orders alongside
each transaction.

## 4. Extending it

- **Products**: edit `backend/data/products.json` (or wire up a real database) — the
  frontend fetches from `/api/products` and falls back to a bundled copy if the API
  is offline.
- **Reviews**: posted via the form at the bottom of the Reviews section, saved to
  `backend/data/reviews.json` through `POST /api/reviews`.
- **Wishlist & cart**: currently kept in browser memory for the session (no
  database/localStorage). To persist across visits, add user accounts and a
  `wishlists` / `carts` table tied to a logged-in user.
- **Auth**: there's no login system yet — add one (e.g. JWT + bcrypt, or a service
  like Auth0) before storing real customer orders.

## 5. Deploying

- Frontend: any static host (Netlify, Vercel, GitHub Pages, S3+CloudFront).
- Backend: any Node host (Render, Railway, Fly.io, a Kenyan VPS). Make sure it's
  HTTPS — Daraja's callback URL **requires** HTTPS in production.
- Switch `MPESA_ENV=production` and use your live Daraja app credentials + real
  Paybill/Till shortcode once Safaricom approves your go-live application.

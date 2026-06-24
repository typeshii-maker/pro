const express = require("express");
const axios = require("axios");
const router = express.Router();

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// In-memory store mapping CheckoutRequestID -> payment status.
// Swap this for a real database (MongoDB/Postgres) in production.
const transactions = new Map();

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

// Normalizes Kenyan numbers (07xx, +254, 254) to the 2547xxxxxxxx format Daraja expects.
function normalizePhone(phone) {
  let p = String(phone).replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  return p;
}

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const { data } = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
}

// POST /api/mpesa/stkpush  { phone, amount, orderRef }
// Triggers the M-Pesa STK Push prompt on the customer's phone.
router.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount, orderRef } = req.body;
    if (!phone || !amount) {
      return res.status(400).json({ error: "phone and amount are required" });
    }

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const ts = timestamp();
    const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString(
      "base64"
    );
    const msisdn = normalizePhone(phone);

    const accessToken = await getAccessToken();

    const { data } = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: msisdn,
        PartyB: shortcode,
        PhoneNumber: msisdn,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: orderRef || "Thrifter",
        TransactionDesc: "Thrifter order payment",
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    transactions.set(data.CheckoutRequestID, { status: "pending", orderRef });

    res.json({
      message: "STK Push sent. Check your phone to enter M-Pesa PIN.",
      checkoutRequestID: data.CheckoutRequestID,
      merchantRequestID: data.MerchantRequestID,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error:
        "Failed to initiate M-Pesa payment. Check your Daraja credentials in .env.",
      details: err.response?.data || err.message,
    });
  }
});

// Safaricom calls this URL directly once the customer enters their PIN.
// MPESA_CALLBACK_URL in .env must point here and be a public HTTPS URL.
router.post("/callback", (req, res) => {
  const body = req.body?.Body?.stkCallback;
  if (body) {
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
      body;
    transactions.set(CheckoutRequestID, {
      status: ResultCode === 0 ? "success" : "failed",
      resultDesc: ResultDesc,
      metadata: CallbackMetadata || null,
    });
    console.log("M-Pesa callback:", CheckoutRequestID, ResultDesc);
  }
  // Safaricom just needs a 200 response acknowledging receipt.
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// GET /api/mpesa/status/:checkoutRequestID
// Frontend polls this after showing "Check your phone" to know when payment clears.
router.get("/status/:id", (req, res) => {
  const tx = transactions.get(req.params.id);
  if (!tx) return res.json({ status: "pending" });
  res.json(tx);
});

module.exports = router;

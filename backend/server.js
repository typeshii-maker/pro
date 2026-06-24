require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const productsRouter = require("./routes/products");
const reviewsRouter = require("./routes/reviews");
const mpesaRouter = require("./routes/mpesa");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "*",
  })
);
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({ message: "Thrifter API is running", endpoints: [
    "GET  /api/products",
    "GET  /api/products/:id",
    "GET  /api/reviews",
    "POST /api/reviews",
    "POST /api/mpesa/stkpush",
    "POST /api/mpesa/callback",
    "GET  /api/mpesa/status/:checkoutRequestID",
  ] });
});

app.use("/api/products", productsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/mpesa", mpesaRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Thrifter API listening on http://localhost:${PORT}`);
});

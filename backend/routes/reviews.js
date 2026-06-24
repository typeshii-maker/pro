const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const REVIEWS_FILE = path.join(__dirname, "..", "data", "reviews.json");

function readReviews() {
  return JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8"));
}

function writeReviews(reviews) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
}

// GET /api/reviews
router.get("/", (req, res) => {
  res.json(readReviews());
});

// POST /api/reviews  { name, rating, text, product }
router.post("/", (req, res) => {
  const { name, rating, text, product } = req.body;

  if (!name || !rating || !text) {
    return res
      .status(400)
      .json({ error: "name, rating and text are required" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be between 1 and 5" });
  }

  const reviews = readReviews();
  const newReview = {
    id: "r" + Date.now(),
    name,
    rating: Number(rating),
    text,
    product: product || null,
  };
  reviews.unshift(newReview);
  writeReviews(reviews);

  res.status(201).json(newReview);
});

module.exports = router;

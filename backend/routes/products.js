const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const PRODUCTS_FILE = path.join(__dirname, "..", "data", "products.json");

function readProducts() {
  const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8");
  return JSON.parse(raw);
}

// GET /api/products  -> all products, optional ?category=men|women|kids and ?search=
router.get("/", (req, res) => {
  const { category, search } = req.query;
  let products = readProducts();

  if (category) {
    products = products.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    const term = search.toLowerCase();
    products = products.filter((p) => p.name.toLowerCase().includes(term));
  }

  res.json({ count: products.length, products });
});

// GET /api/products/:id -> single product
router.get("/:id", (req, res) => {
  const products = readProducts();
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});

module.exports = router;

/* =========================================================
   THRIFTER — frontend logic
   Talks to the Express/M-Pesa backend at API_BASE.
   Falls back to local sample data if the backend isn't running,
   so the page still works while you wire up the API.
   ========================================================= */

  //  connection for backend
const API_BASE = "https://thrifter-uuqn.onrender.com/api";

// ---- Fallback data (mirrors backend/data/products.json) ----
const FALLBACK_PRODUCTS = [
  { id:"m01", name:"Vintage Denim Jacket", category:"men", price:1800, originalPrice:6500, condition:"Excellent", size:"M / L", image:"https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop", tag:"Bestseller" },
  { id:"m02", name:"Plaid Wool Overcoat", category:"men", price:2400, originalPrice:9000, condition:"Like New", size:"L", image:"https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop", tag:"Rare Find" },
  { id:"m03", name:"Striped Cotton Shirt", category:"men", price:900, originalPrice:3200, condition:"Good", size:"S / M", image:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=600&auto=format&fit=crop", tag:null },
  { id:"m04", name:"Leather Biker Boots", category:"men", price:2100, originalPrice:8000, condition:"Excellent", size:"42", image:"https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=600&auto=format&fit=crop", tag:"Trending" },
  { id:"w01", name:"Floral Wrap Midi Dress", category:"women", price:1500, originalPrice:5500, condition:"Like New", size:"M", image:"https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=600&auto=format&fit=crop", tag:"Bestseller" },
  { id:"w02", name:"Tailored Beige Blazer", category:"women", price:1700, originalPrice:6000, condition:"Excellent", size:"S / M", image:"https://images.unsplash.com/photo-1591369822096-ffd140ec948f?q=80&w=600&auto=format&fit=crop", tag:"Rare Find" },
  { id:"w03", name:"Vintage Silk Scarf Blouse", category:"women", price:1100, originalPrice:3800, condition:"Good", size:"S", image:"https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=600&auto=format&fit=crop", tag:null },
  { id:"w04", name:"Suede Ankle Boots", category:"women", price:1950, originalPrice:7200, condition:"Excellent", size:"38", image:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop", tag:"Trending" },
  { id:"k01", name:"Denim Overalls Set", category:"kids", price:700, originalPrice:2500, condition:"Excellent", size:"4-5yrs", image:"https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=600&auto=format&fit=crop", tag:"Bestseller" },
  { id:"k02", name:"Hooded Fleece Jacket", category:"kids", price:600, originalPrice:2200, condition:"Good", size:"6-7yrs", image:"https://images.unsplash.com/photo-1622290319246-25e9c88cd5ca?q=80&w=600&auto=format&fit=crop", tag:null },
  { id:"k03", name:"Striped Cotton Romper", category:"kids", price:450, originalPrice:1600, condition:"Like New", size:"1-2yrs", image:"https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=600&auto=format&fit=crop", tag:"Rare Find" },
  { id:"k04", name:"Canvas Velcro Sneakers", category:"kids", price:550, originalPrice:1900, condition:"Excellent", size:"28 EU", image:"https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop", tag:"Trending" }
];

const FALLBACK_REVIEWS = [
  { id:"r01", name:"Achieng W.", rating:5, text:"Found a Plaid wool overcoat for 2,400 that would've cost me 9k brand new. Quality is honestly better than most new stuff I've bought.", product:"Plaid Wool Overcoat" },
  { id:"r02", name:"Brian K.", rating:5, text:"The M-Pesa checkout was so smooth, paid and got a confirmation in seconds. Jacket arrived exactly as pictured.", product:"Vintage Denim Jacket" },
  { id:"r03", name:"Naomi M.", rating:4, text:"Love the wishlist feature, I save pieces and wait for restocks. The wrap dress I got was barely worn, smelled fresh too.", product:"Floral Wrap Midi Dress" },
  { id:"r04", name:"Kevin O.", rating:5, text:"Got my daughter the denim overalls for a fraction of retail. She's already outgrowing clothes every few months so this is a lifesaver.", product:"Denim Overalls Set" }
];

// ---- App state (in-memory only — no localStorage, by design) ----
let PRODUCTS = [];
let REVIEWS = [];
let cart = [];        // [{id, qty}]
let wishlist = new Set();
let activeFilter = "all";
let pickedStars = 5;

const fmt = (n) => "KSh " + Number(n).toLocaleString();

// ---- Data loading ----
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();
    PRODUCTS = data.products || data;
  } catch (e) {
    PRODUCTS = FALLBACK_PRODUCTS;
  }
  renderProducts();
}

async function loadReviews() {
  try {
    const res = await fetch(`${API_BASE}/reviews`);
    REVIEWS = await res.json();
  } catch (e) {
    REVIEWS = FALLBACK_REVIEWS;
  }
  renderReviews();
}

// ---- Product rendering ----
function discountPct(p) {
  if (!p.originalPrice) return null;
  return Math.round(100 - (p.price / p.originalPrice) * 100);
}

function productCard(p) {
  const disc = discountPct(p);
  const isWished = wishlist.has(p.id);
  return `
  <div class="col-6 col-md-4 col-lg-3 product-col" data-cat="${p.category}">
    <div class="product-card">
      <div class="product-thumb">
        ${p.tag ? `<span class="badge-flag">${p.tag}</span>` : ""}
        <button class="wish-btn ${isWished ? "active" : ""}" data-id="${p.id}" aria-label="Add to wishlist" onclick="toggleWishlist('${p.id}')">
          <i class="bi ${isWished ? "bi-heart-fill" : "bi-heart"}"></i>
        </button>
        <img src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-body">
        <p class="product-meta">${p.category} &middot; size ${p.size} &middot; ${p.condition}</p>
        <p class="p-name">${p.name}</p>
        <div class="price-tag">
          <span class="now">${fmt(p.price)}</span>
          ${p.originalPrice ? `<span class="was">${fmt(p.originalPrice)}</span>` : ""}
        </div>
        ${disc ? `<div class="eyebrow mt-1">-${disc}% vs retail</div>` : ""}
        <div class="product-actions">
          <button class="btn-add" onclick="addToCart('${p.id}')"><i class="bi bi-bag-plus me-1"></i>Add to cart</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const list = activeFilter === "all"
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === activeFilter);

  grid.innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="col-12 text-center py-5 eyebrow">No pieces found in this category yet</div>`;
}

function setFilter(cat) {
  activeFilter = cat;
  document.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  renderProducts();
}

// ---- Wishlist ----
function toggleWishlist(id) {
  if (wishlist.has(id)) wishlist.delete(id);
  else wishlist.add(id);
  renderProducts();
  renderWishlist();
}

function renderWishlist() {
  const body = document.getElementById("wishlistBody");
  const items = PRODUCTS.filter((p) => wishlist.has(p.id));
  document.getElementById("wishlistCount").textContent = wishlist.size;

  body.innerHTML = items.length
    ? items.map((p) => `
      <div class="cart-line">
        <img src="${p.image}" alt="${p.name}">
        <div class="flex-grow-1">
          <p class="name">${p.name}</p>
          <p class="meta">${fmt(p.price)}</p>
          <div class="d-flex gap-2 mt-1">
            <button class="btn-add" style="flex:none; padding:0.35rem 0.7rem;" onclick="addToCart('${p.id}')">Add to cart</button>
            <button class="remove-link" onclick="toggleWishlist('${p.id}'); ">Remove</button>
          </div>
        </div>
      </div>`).join("")
    : `<p class="eyebrow text-center py-4">Your wishlist is empty. Tap the heart on any piece you love.</p>`;
}

// ---- Cart ----
function addToCart(id) {
  const line = cart.find((c) => c.id === id);
  if (line) line.qty += 1;
  else cart.push({ id, qty: 1 });
  renderCart();
  flashCartIcon();
  const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("cartOffcanvas"));
  offcanvas.show();
}

function changeQty(id, delta) {
  const line = cart.find((c) => c.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((c) => c.id !== id);
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((c) => c.id !== id);
  renderCart();
}

function cartTotal() {
  return cart.reduce((sum, line) => {
    const p = PRODUCTS.find((pr) => pr.id === line.id);
    return sum + (p ? p.price * line.qty : 0);
  }, 0);
}

function renderCart() {
  const body = document.getElementById("cartBody");
  const count = cart.reduce((n, c) => n + c.qty, 0);
  document.getElementById("cartCount").textContent = count;

  body.innerHTML = cart.length
    ? cart.map((line) => {
        const p = PRODUCTS.find((pr) => pr.id === line.id);
        if (!p) return "";
        return `
        <div class="cart-line">
          <img src="${p.image}" alt="${p.name}">
          <div class="flex-grow-1">
            <p class="name">${p.name}</p>
            <p class="meta">${fmt(p.price)} &middot; size ${p.size}</p>
            <div class="d-flex align-items-center gap-2 mt-1">
              <button class="qty-btn" onclick="changeQty('${p.id}', -1)">−</button>
              <span class="eyebrow">${line.qty}</span>
              <button class="qty-btn" onclick="changeQty('${p.id}', 1)">+</button>
              <button class="remove-link ms-2" onclick="removeFromCart('${p.id}')">Remove</button>
            </div>
          </div>
        </div>`;
      }).join("")
    : `<p class="eyebrow text-center py-4">Your bag is empty. Go find something good.</p>`;

  document.getElementById("cartTotal").textContent = fmt(cartTotal());
  document.getElementById("mpesaAmount").textContent = fmt(cartTotal());
}

function flashCartIcon() {
  const icon = document.getElementById("cartIconBtn");
  icon.classList.add("active");
  setTimeout(() => icon.classList.remove("active"), 250);
}

// ---- Reviews ----
function starString(rating) {
  return "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);
}

function renderReviews() {
  const wrap = document.getElementById("reviewsRow");
  wrap.innerHTML = REVIEWS.map((r) => `
    <div class="col-md-6 col-lg-3">
      <div class="review-card">
        <div class="stars">${starString(r.rating)}</div>
        <p class="quote">"${r.text}"</p>
        <p class="review-name mb-0">${r.name}</p>
        ${r.product ? `<p class="review-product">on ${r.product}</p>` : ""}
      </div>
    </div>`).join("");
}

function pickStar(n) {
  pickedStars = n;
  document.querySelectorAll("#starPicker i").forEach((star, idx) => {
    star.classList.toggle("filled", idx < n);
  });
}

async function submitReview(e) {
  e.preventDefault();
  const name = document.getElementById("reviewName").value.trim();
  const text = document.getElementById("reviewText").value.trim();
  const product = document.getElementById("reviewProduct").value;
  if (!name || !text) return;

  const payload = { name, rating: pickedStars, text, product };

  try {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const saved = await res.json();
    REVIEWS.unshift(saved);
  } catch (err) {
    REVIEWS.unshift({ id: "local-" + Date.now(), ...payload });
  }

  renderReviews();
  e.target.reset();
  pickStar(5);
  document.getElementById("reviewSuccess").classList.remove("d-none");
  setTimeout(() => document.getElementById("reviewSuccess").classList.add("d-none"), 3000);
}

// ---- M-Pesa checkout ----
async function payWithMpesa(e) {
  e.preventDefault();
  const phone = document.getElementById("mpesaPhone").value.trim();
  const statusBox = document.getElementById("mpesaStatus");
  const amount = cartTotal();

  if (!phone || cart.length === 0) return;

  statusBox.className = "alert alert-dark mt-3";
  statusBox.classList.remove("d-none");
  statusBox.innerHTML = `<i class="bi bi-hourglass-split me-2"></i>Sending STK push to ${phone}…`;

  try {
    const res = await fetch(`${API_BASE}/mpesa/stkpush`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, amount, orderRef: "THRIFTER-" + Date.now() }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Payment request failed");

    statusBox.className = "alert alert-success mt-3";
    statusBox.innerHTML = `<i class="bi bi-phone-vibrate me-2"></i>${data.message || "Check your phone to enter your M-Pesa PIN."}`;
    pollMpesaStatus(data.checkoutRequestID, statusBox);
  } catch (err) {
    statusBox.className = "alert alert-warning mt-3";
    statusBox.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>Couldn't reach the Thrifter payment server. Make sure the backend is running on port 4000 with valid Daraja credentials in .env. (${err.message})`;
  }
}

function pollMpesaStatus(checkoutRequestID, statusBox) {
  if (!checkoutRequestID) return;
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`${API_BASE}/mpesa/status/${checkoutRequestID}`);
      const data = await res.json();
      if (data.status === "success") {
        clearInterval(interval);
        statusBox.className = "alert alert-success mt-3";
        statusBox.innerHTML = `<i class="bi bi-check-circle me-2"></i>Payment received! Your Thrifter order is confirmed.`;
        cart = [];
        renderCart();
      } else if (data.status === "failed") {
        clearInterval(interval);
        statusBox.className = "alert alert-danger mt-3";
        statusBox.innerHTML = `<i class="bi bi-x-circle me-2"></i>Payment was not completed: ${data.resultDesc || "cancelled"}.`;
      }
    } catch (e) { /* keep waiting */ }
    if (attempts > 20) clearInterval(interval);
  }, 3000);
}

// ---- Search ----
function handleSearch(e) {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".product-col").forEach((col) => {
    const name = col.querySelector(".p-name").textContent.toLowerCase();
    col.style.display = name.includes(term) ? "" : "none";
  });
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadReviews();
  renderCart();
  renderWishlist();
  pickStar(5);

  document.querySelectorAll(".filter-pill").forEach((btn) =>
    btn.addEventListener("click", () => setFilter(btn.dataset.cat))
  );
  document.getElementById("searchInput").addEventListener("input", handleSearch);
  document.getElementById("reviewForm").addEventListener("submit", submitReview);
  document.getElementById("mpesaForm").addEventListener("submit", payWithMpesa);
  document.querySelectorAll("#starPicker i").forEach((star, idx) =>
    star.addEventListener("click", () => pickStar(idx + 1))
  );
});

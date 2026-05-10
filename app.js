// ── CONFIG DATA ───────────────────────────────────────────────────────────────
let CONFIG = {};
let PROMO_CODE = '';
let PROMO_DISCOUNT = 0;
let SHOPPHONE = '';
let USERNAME = '';
let PASSWORD = '';
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

async function loadConfig() {
  try {
    const response = await fetch('./config.json');

    if (!response.ok) {
      throw new Error('Failed to load config.json');
    }

    CONFIG = await response.json();

    PROMO_CODE        = CONFIG.promocode;
    PROMO_DISCOUNT    = CONFIG.promodiscount;
    SHOPPHONE         = CONFIG.shopphone;
    USER_ID           = CONFIG.userid;
    SUPABASE_URL      = CONFIG.supabaseurl;      // fixed spelling
    SUPABASE_ANON_KEY = CONFIG.supabaseanonkey; // fixed key name

    console.log('Config Loaded:', CONFIG);

  } catch (err) {
    console.error('Error loading config:', err);
  }
}

// ── PRODUCT DATA ──────────────────────────────────────────────────────────────
let PRODUCTS = [];

// ── LOAD PRODUCTS ─────────────────────────────────────────────────────────────
async function loadProducts() {

  // WAIT until config loads
  await loadConfig();

  try {

    const supabaseClient = supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

    // fetch data properly
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq("user_id", USER_ID)
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    PRODUCTS = data || [];

    console.log('Products:', PRODUCTS);

    render();
    updateCartUI();

  } catch (err) {
    console.error('Error loading products:', err);
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadProducts);
// ── STATE ─────────────────────────────────────────────────────────────────────
let cart = {};       // { id: quantity }
let priceFilter = 'all';
let categoryFilter = 'all';
let promoApplied = false;

// Valid promo: only works if ALL cart items have a badge (are "offer products")


// ── FILTERS ───────────────────────────────────────────────────────────────────
function setPrice(val, el) {
  priceFilter = val;
  document.querySelectorAll('.pill[data-price]').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  render();
}
function setCategory(val) {
  categoryFilter = val;
  const catPill = document.getElementById('catPill');
  if (val !== 'all') {
    catPill.classList.add('active');
  } else {
    catPill.classList.remove('active');
  }
  render();
}

function filteredProducts() {
  return PRODUCTS.filter(p => {
    const catOk = categoryFilter === 'all' || p.category === categoryFilter;
    let priceOk = true;
    if (priceFilter === '299') priceOk = p.price <= 299;
    else if (priceFilter === '599') priceOk = p.price >= 300 && p.price <= 599;
    else if (priceFilter === '999') priceOk = p.price >= 600 && p.price <= 999;
    else if (priceFilter === '1999') priceOk = p.price >= 1000;
    return catOk && priceOk;
  });
}

// ── CART ──────────────────────────────────────────────────────────────────────
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  updateCartUI();
  const btn = document.getElementById('add-' + id);
  if (btn) { btn.textContent = '✓'; btn.classList.add('added'); }
}
function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  updateCartUI();
  renderCartDrawer();
  // Re-check add btn state
  const btn = document.getElementById('add-' + id);
  if (btn) {
    if (cart[id]) { btn.textContent = '✓'; btn.classList.add('added'); }
    else { btn.textContent = '+'; btn.classList.remove('added'); }
  }
}

function cartTotal() {
  return Object.entries(cart).reduce((s,[id,qty]) => {
    const p = PRODUCTS.find(x => x.id === +id);
    return s + (p ? p.price * qty : 0);
  }, 0);
}
function cartCount() {
  return Object.values(cart).reduce((s, q) => s + q, 0);
}

function updateCartUI() {
  const count = cartCount();
  document.getElementById('cartCount').textContent = count;
  const bar = document.getElementById('bottomBar');
  if (count > 0) {
    bar.classList.add('visible');
    document.getElementById('barCount').textContent = `${count} item${count>1?'s':''}`;
    document.getElementById('barTotal').textContent = `₹${cartTotal().toLocaleString('en-IN')}`;
  } else {
    bar.classList.remove('visible');
  }
}


// ── RENDER GRID ───────────────────────────────────────────────────────────────
function render() {
  const SHOPLOGO = 'https://qpeimg.b-cdn.net/ecommerce_store/12116/img_6980590e724f88.33969851.png';
  const SHOPNAME = 'Bella Fashions';
  document.getElementById('shopLogo').innerHTML = `<img src="${SHOPLOGO}" class="logo-img skeleton"><span>${SHOPNAME}</span>`;
  const products = (priceFilter !== 'all' || categoryFilter !== 'all') ? filteredProducts() : PRODUCTS;
  console.log('products under render function', products);
  const grid = document.getElementById('productGrid');
  const none = document.getElementById('noProducts');
  const info = document.getElementById('resultsInfo');
  const noneText = document.getElementById('noProductsText');
  const noneEmoji = document.getElementById('noneEmoji');

  info.innerHTML = `Showing <span>${products.length}</span> products`;

  if (!products.length) {
    grid.innerHTML = '';
    none.style.display = 'block';

    if (priceFilter !== 'all' || categoryFilter !== 'all') {
      console.log('selected price filter', priceFilter);
      console.log('selected category filter', categoryFilter);

      noneText.innerText = 'No products found for this filter.';
      noneEmoji.innerText = '🔍';
    } else {
      noneText.innerText = 'Handpicking products just for you.';
      noneEmoji.innerText = '🛍️';
    }
    return;
    } else {
    none.style.display = 'none';
  }

  grid.innerHTML = products.map(p => {
    const inCart = cart[p.id] > 0;
    return `
    <div class="card">
      <img class="card-img" src="${p.image}" alt="${p.name}" loading="lazy" />
      ${p.badge ? `<div class="badge">${p.badge}</div>` : ''}
      <button class="add-btn ${inCart ? 'added' : ''}" id="add-${p.id}" onclick="addToCart(${p.id})">${inCart ? '✓' : '+'}</button>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="price-row">
          <span class="discount-tag">-${p.discount}%</span>
          <span class="price"><sup>₹</sup>${p.price.toLocaleString('en-IN')}</span>
          <span class="original">₹${p.originalPrice.toLocaleString('en-IN')}</span>
        </div>
        ${p.superbadge != null ? `<div class="deal-label">${p.superbadge}</div>` : ''}
        ${p.sold ? `<div class="sold-info">${p.sold}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── PROMO ─────────────────────────────────────────────────────────────────────
function allCartItemsOnOffer() {
  // Returns true only if every product in cart has offer = "yes"
  return Object.keys(cart).every(id => {
    const p = PRODUCTS.find(x => x.id === +id);
    return p && p.offer === "yes";
  });
}

function togglePromo() {
  if (promoApplied) {
    removePromo();
  } else {
    applyPromo();
  }
}

function applyPromo() {
  const input = document.getElementById('promoInput').value.trim().toUpperCase();
  const msg = document.getElementById('promoMsg');
  const btn = document.getElementById('promoBtn');

  const items = Object.keys(cart).filter(id => (cart[id] || 0) > 0);

  if (!items.length) {
    msg.textContent = 'Add products to your cart first.';
    msg.className = 'promo-msg error';
    return;
  }

  if (input !== PROMO_CODE) {
    promoApplied = false;
    msg.textContent = 'Invalid promo code.';
    msg.className = 'promo-msg error';
    renderCartDrawer();
    return;
  }

  if (!allCartItemsOnOffer()) {
    promoApplied = false;
    msg.textContent = 'Promo only valid when all items are offer products.';
    msg.className = 'promo-msg error';
    renderCartDrawer();
    return;
  }

  promoApplied = true;

  msg.textContent = 'Promo applied! 10% off on your order.';
  msg.className = 'promo-msg success';

  // Change button to REMOVE state
  btn.innerText = 'Remove';
  btn.classList.add('remove');

  renderCartDrawer();
}

function removePromo() {
  const msg = document.getElementById('promoMsg');
  const btn = document.getElementById('promoBtn');
  const input = document.getElementById('promoInput');

  promoApplied = false;

  // Clear promo input
  input.value = '';

  msg.textContent = 'Promo removed.';
  msg.className = 'promo-msg';

  // Reset button back to APPLY
  btn.innerText = 'Apply';
  btn.classList.remove('remove');

  renderCartDrawer();
}

function finalTotal() {
  const raw = cartTotal();
  return promoApplied ? Math.round(raw * (1 - PROMO_DISCOUNT)) : raw;
}

// ── CART DRAWER ───────────────────────────────────────────────────────────────
function renderCartDrawer() {
  const items = Object.entries(cart).filter(([,q]) => q > 0);
  const el = document.getElementById('cartItems');

  if (!items.length) {
    el.innerHTML = `<div class="cart-empty"><div class="icon">🛒</div><p>Your cart is empty</p></div>`;
    document.getElementById('totalAmount').textContent = '₹0';
    document.getElementById('proceedBtn').disabled = true;
    document.getElementById('promoSavings').style.display = 'none';
    // Reset promo if cart emptied
    promoApplied = false;
    document.getElementById('promoMsg').textContent = '';
    document.getElementById('promoInput').value = '';
    return;
  }

  document.getElementById('proceedBtn').disabled = false;

  // Re-validate promo if cart changed (non-offer item added)
  if (promoApplied && !allCartItemsOnOffer()) {
    promoApplied = false;
    document.getElementById('promoMsg').textContent = 'Promo removed — cart has non-offer items.';
    document.getElementById('promoMsg').className = 'promo-msg error';
  }

  const raw = cartTotal();
  const final = finalTotal();
  const savings = raw - final;

  document.getElementById('totalAmount').textContent = `₹${final.toLocaleString('en-IN')}`;

  const savingsRow = document.getElementById('promoSavings');
  if (promoApplied && savings > 0) {
    savingsRow.style.display = 'flex';
    document.getElementById('savingsAmt').textContent = `-₹${savings.toLocaleString('en-IN')}`;
  } else {
    savingsRow.style.display = 'none';
  }

  el.innerHTML = items.map(([id, qty]) => {
    const p = PRODUCTS.find(x => x.id === +id);
    if (!p) return '';
    return `
    <div class="cart-item">
      <img src="${p.image}" alt="${p.name}" />
      <div class="ci-info">
        <div class="ci-name">${p.name}${p.offer === "yes" ? ` <span style="font-size:0.65rem;background:#fff3e0;color:#e65100;padding:1px 5px;border-radius:4px;font-weight:800;">${PROMO_DISCOUNT * 100}% OFFER</span>` : ''}</div>
        <div class="ci-price">₹${(p.price * qty).toLocaleString('en-IN')}</div>
      </div>
      <div class="ci-qty">
        <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
        <span class="qty-num">${qty}</span>
        <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
      </div>
    </div>`;
  }).join('');
}

function openCart() {
  renderCartDrawer();
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartDrawer').classList.remove('open');
  document.body.style.overflow = '';
}

// ── ADDRESS MODAL ─────────────────────────────────────────────────────────────
function openAddr() {
  const items = Object.entries(cart).filter(([,q]) => q > 0);
  if (!items.length) return;
  document.getElementById('addrOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAddr() {
  document.getElementById('addrOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function fieldErr(id, errId, show) {
  const el = document.getElementById(id);
  const em = document.getElementById(errId);
  if (show) { el.classList.add('error'); em && em.classList.add('show'); }
  else       { el.classList.remove('error'); em && em.classList.remove('show'); }
}

function validateAddr() {
  let ok = true;
  const name  = document.getElementById('f_name').value.trim();
  const phone = document.getElementById('f_phone').value.trim();
  const addr  = document.getElementById('f_addr').value.trim();
  const city  = document.getElementById('f_city').value.trim();
  const state = document.getElementById('f_state').value;
  const country = document.getElementById('f_country').value;
  const pin   = document.getElementById('f_pin').value.trim();

  fieldErr('f_name',    'e_name',    !name);
  if (!name) ok = false;

  const phoneOk = /^[6-9]\d{9}$/.test(phone) || /^\+?\d{7,15}$/.test(phone);
  fieldErr('f_phone', 'e_phone', !phoneOk);
  if (!phoneOk) ok = false;

  fieldErr('f_addr',  'e_addr',  !addr);
  if (!addr) ok = false;

  fieldErr('f_city',  'e_city',  !city);
  if (!city) ok = false;

  fieldErr('f_state', 'e_state', !state);
  if (!state) ok = false;

  fieldErr('f_country', 'e_country', !country);
  if (!country) ok = false;

  const pinOk = /^\d{4,10}$/.test(pin);
  fieldErr('f_pin', 'e_pin', !pinOk);
  if (!pinOk) ok = false;

  return ok;
}

function submitOrder() {
  if (!validateAddr()) return;

  const name     = document.getElementById('f_name').value.trim();
  const phone    = document.getElementById('f_phone').value.trim();
  const email    = document.getElementById('f_email').value.trim();
  const org      = document.getElementById('f_org').value.trim();
  const addr     = document.getElementById('f_addr').value.trim();
  const city     = document.getElementById('f_city').value.trim();
  const district = document.getElementById('f_district').value.trim();
  const state    = document.getElementById('f_state').value;
  const country  = document.getElementById('f_country').value;
  const pin      = document.getElementById('f_pin').value.trim();

  const items = Object.entries(cart).filter(([,q]) => q > 0);
  let lines = items.map(([id, qty], i) => {
    const p = PRODUCTS.find(x => x.id === +id);
    const subtotal = p.price * qty;
    return `${i+1}. ${p.name}${qty > 1 ? ` (x${qty})` : ''} - ₹${subtotal.toLocaleString('en-IN')}`;
  });

  const raw   = cartTotal();
  const final = finalTotal();

  let msg = `Hi! I want to place an order 🛒\n`;
  msg += `${'─'.repeat(30)}\n`;
  msg += `*ORDER DETAILS*\n`;
  msg += lines.join('\n') + '\n';
  if (promoApplied) {
    msg += `\nSubtotal: ₹${raw.toLocaleString('en-IN')}`;
    msg += `\nPromo (${PROMO_CODE}): -₹${(raw - final).toLocaleString('en-IN')}`;
  }
  msg += `\n*Total: ₹${final.toLocaleString('en-IN')}*\n`;
  msg += `${'─'.repeat(30)}\n`;
  msg += `*DELIVERY DETAILS*\n`;
  msg += `Name: ${name}\n`;
  msg += `Phone: ${phone}\n`;
  if (email)    msg += `Email: ${email}\n`;
  if (org)      msg += `Organisation: ${org}\n`;
  msg += `Address: ${addr}\n`;
  msg += `City: ${city}\n`;
  if (district) msg += `District: ${district}\n`;
  msg += `State: ${state}\n`;
  msg += `Country: ${country}\n`;
  msg += `Pincode: ${pin}\n`;

  const url = `https://wa.me/${SHOPPHONE}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  closeAddr();
}

// ── WHATSAPP (now opens address modal) ───────────────────────────────────────
function proceedWhatsApp() {
  closeCart();
  setTimeout(openAddr, 320); // wait for cart drawer close animation
}

// ── INIT ──────────────────────────────────────────────────────────────────────
render();
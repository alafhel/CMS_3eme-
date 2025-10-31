// ...existing code...
const COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' }
];

const tickersEl = document.getElementById('tickers');
const totalBalanceEl = document.getElementById('totalBalance');
const lastUpdateEl = document.getElementById('lastUpdate');
const selectedTitle = document.getElementById('selectedTitle');
const selPrice = document.getElementById('selPrice');
const selChange = document.getElementById('selChange');
const selVol = document.getElementById('selVol');
const canvas = document.getElementById('sparkline');
const ctx = canvas.getContext('2d');

let state = {
  data: {},
  selected: COINS[0].id,
  balances: { bitcoin: 0.05, ethereum: 0.5, cardano: 100, ripple: 200 } // demo balances
};

function formatCurrency(n){
  return Number(n).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function renderTickers(){
  tickersEl.innerHTML = '';
  for (const c of COINS){
    const d = state.data[c.id] || {};
    const price = d.usd ?? 0;
    const change = d.usd_24h_change ?? 0;
    const el = document.createElement('div');
    el.className = 'ticker';
    el.dataset.coin = c.id;
    el.innerHTML = `
      <div class="left">
        <div class="coin-badge">${c.symbol}</div>
        <div>
          <div class="coin-name">${c.name}</div>
          <div class="coin-sub">${c.symbol}</div>
        </div>
      </div>
      <div class="right">
        <div class="price">€ ${formatCurrency(price)}</div>
        <div class="change" style="color:${change>=0? 'var(--success)':'var(--danger)'}">${change ? change.toFixed(2)+'%' : '--'}</div>
      </div>
    `;
    el.addEventListener('click', () => selectCoin(c.id));
    tickersEl.appendChild(el);
  }
}

function updateBalanceUI(){
  // approximate euro balance using prices (prices are in USD, convert with fixed rate for demo)
  const usdToEur = 0.92; // demo conversion
  let total = 0;
  for (const c of COINS){
    const bal = state.balances[c.id] ?? 0;
    const priceUsd = (state.data[c.id] && state.data[c.id].usd) ? state.data[c.id].usd : 0;
    total += bal * priceUsd * usdToEur;
  }
  totalBalanceEl.textContent = formatCurrency(total);
  lastUpdateEl.textContent = new Date().toLocaleTimeString();
}

async function fetchPrices(){
  try {
    const ids = COINS.map(c=>c.id).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    const json = await res.json();
    // map to convenient keys
    for (const id of Object.keys(json)){
      state.data[id] = {
        usd: json[id].usd,
        usd_24h_change: json[id].usd_24h_change
      };
    }
  } catch (err){
    console.error('fetchPrices error', err);
    // fallback demo values
    state.data.bitcoin = { usd: 60000, usd_24h_change: 1.2 };
    state.data.ethereum = { usd: 3500, usd_24h_change: -0.5 };
    state.data.cardano = { usd: 0.95, usd_24h_change: 2.1 };
    state.data.ripple = { usd: 0.45, usd_24h_change: -1.3 };
  }
  renderTickers();
  updateBalanceUI();
  if (!state.selected) state.selected = COINS[0].id;
  updateSelectedUI();
}

function selectCoin(id){
  state.selected = id;
  updateSelectedUI();
  fetchAndDrawSparkline(id);
}

function updateSelectedUI(){
  const coin = COINS.find(c=>c.id===state.selected);
  const d = state.data[state.selected] || {};
  selectedTitle.textContent = `${coin.name} (${coin.symbol})`;
  selPrice.textContent = d.usd ? `€ ${formatCurrency(d.usd * 0.92)}` : '-'; // demo conv to EUR
  selChange.textContent = d.usd_24h_change ? `${d.usd_24h_change.toFixed(2)}%` : '-';
  selVol.textContent = '-';
}

async function fetchAndDrawSparkline(id){
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1&interval=hourly`;
    const res = await fetch(url);
    const json = await res.json();
    const prices = (json.prices || []).map(p => p[1]);
    drawSparkline(prices);
  } catch (err){
    console.error('sparkline fetch error', err);
    drawSparkline([]);
  }
}

function drawSparkline(data){
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0,0,w,h);
  if (!data || data.length === 0){
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'var(--muted)';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Aucune donnée', w/2 - 40, h/2);
    return;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const len = data.length;
  const pad = 12;
  const scaleX = (w - pad*2) / Math.max(1, len-1);
  const scaleY = (h - pad*2) / (max - min || 1);

  // gradient fill
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0, 'rgba(124,58,237,0.28)');
  grad.addColorStop(1, 'rgba(6,182,212,0.04)');

  ctx.beginPath();
  for (let i=0;i<len;i++){
    const x = pad + i * scaleX;
    const y = h - pad - (data[i] - min) * scaleY;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#9b6cff';
  ctx.stroke();

  // fill under curve
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(pad, h - pad);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // draw latest point
  const lastX = pad + (len-1) * scaleX;
  const lastY = h - pad - (data[len-1] - min) * scaleY;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

/* modal / buy simulation */
const modal = document.getElementById('modal');
const buyBtn = document.getElementById('buyBtn');
const sellBtn = document.getElementById('sellBtn');
const closeModal = document.getElementById('closeModal');
const confirmPay = document.getElementById('confirmPay');
const payAmount = document.getElementById('payAmount');
const modalMsg = document.getElementById('modalMsg');

buyBtn.addEventListener('click', () => openModal('Acheter'));
sellBtn.addEventListener('click', () => openModal('Vendre'));
closeModal.addEventListener('click', close);
confirmPay.addEventListener('click', confirm);

function openModal(action){
  document.getElementById('modalTitle').textContent = action;
  payAmount.value = '';
  modalMsg.textContent = '';
  modal.hidden = false;
}

function close(){ modal.hidden = true; }

function confirm(){
  const amt = parseFloat(payAmount.value);
  if (!amt || amt <= 0) { modalMsg.textContent = 'Montant invalide'; return; }
  modalMsg.textContent = 'Traitement...';
  confirmPay.disabled = true;
  setTimeout(()=>{
    // approx purchase: use selected price to compute units and add to balances
    const priceUsd = state.data[state.selected] ? state.data[state.selected].usd : 0;
    const usdToEur = 0.92;
    const priceEur = priceUsd * usdToEur;
    const units = (priceEur>0) ? (amt / priceEur) : 0;
    state.balances[state.selected] = (state.balances[state.selected]||0) + units;
    modalMsg.textContent = `Achat simulé : ${units.toFixed(6)} ${state.selected.toUpperCase()}`;
    confirmPay.disabled = false;
    updateBalanceUI();
    setTimeout(close, 1300);
  }, 900);
}

/* initial load and interval refresh */
async function init(){
  await fetchPrices();
  await fetchAndDrawSparkline(state.selected);
  // refresh every 30s
  setInterval(fetchPrices, 30000);
}
init();
// ...existing code...
const closeModal = document.getElementById('closeModal');
+const closeAndHome = document.getElementById('closeAndHome');
const confirmPay = document.getElementById('confirmPay');
const payAmount = document.getElementById('payAmount');
const modalMsg = document.getElementById('modalMsg');

buyBtn.addEventListener('click', () => openModal('Acheter'));
sellBtn.addEventListener('click', () => openModal('Vendre'));
closeModal.addEventListener('click', close);
+// ferme la modal puis redirige vers la page home
+if (closeAndHome) {
+  closeAndHome.addEventListener('click', () => {
+    modal.hidden = true;
+    // chemin relatif vers ta page home — adapte si nécessaire
+    window.location.href = '../home/index.html';
+  });
+}
confirmPay.addEventListener('click', confirm);
// ...existing code...
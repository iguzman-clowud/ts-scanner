// ====== CONFIG ======
const WEBHOOK_URL = "https://webhook.site/replace-this-with-your-unique-url"; // temp bin to see payloads
const AUTH_TOKEN  = ""; // optional: e.g., "supersecret123"
const DUPLICATE_LOCK_MS = 2500; // ignore same code for 2.5s

// read ?uid=... from URL (when embedded in Glide)
const USER_ID = new URLSearchParams(location.search).get("uid") || "demo_user";

// ui helpers
const statusEl = document.getElementById("status");
const toastEl  = document.getElementById("toast");
function setStatus(t){ statusEl.innerHTML = t; }
function toast(msg,type=""){ toastEl.className = `toast show ${type}`; toastEl.textContent = msg; clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove("show"),1100); }

// POST scan to webhook
async function sendScan(code){
  const payload = {
    boxId: code,
    userId: USER_ID,
    device: "webview",
    event: "scan",
    ts: new Date().toISOString()
  };
  const headers = { "Content-Type":"application/json" };
  if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;

  try{
    setStatus(`Sending… <span class="badge">${new Date().toLocaleTimeString()}</span>`);
    const res = await fetch(WEBHOOK_URL,{ method:"POST", headers, body: JSON.stringify(payload) });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    toast(`✓ ${code} sent`,"ok");
    setStatus(`Sent • ${new Date().toLocaleTimeString()}`);
  }catch(err){
    console.error(err);
    toast("× send failed","err");
    setStatus(`Error • ${err.message}`);
  }
}

// debounce duplicate frames
let lastCode=null, lastTime=0;
function onScan(decodedText){
  const now = Date.now();
  if(decodedText===lastCode && (now-lastTime)<DUPLICATE_LOCK_MS) return;
  lastCode=decodedText; lastTime=now;
  toast(`Scanned: ${decodedText}`);
  sendScan(decodedText);
}

// init scanner
(async function start(){
  const config = {
    fps: 12,
    qrbox: (vw, vh) => {
      const minEdge = Math.min(vw, vh);
      const box = Math.min(520, Math.floor(minEdge*0.75));
      return { width: box, height: box };
    },
    aspectRatio: 1.777,
    rememberLastUsedCamera: true
  };
  const scanner = new Html5Qrcode("reader");
  try{
    setStatus("Requesting camera…");
    const cams = await Html5Qrcode.getCameras();
    const camId = cams?.[0]?.id;
    await scanner.start(camId, config, onScan, () => {});
    setStatus(`Camera on • ${cams?.[0]?.label || "default"}`);
  }catch(e){
    console.error(e);
    setStatus("Camera error");
    toast("Enable camera permission","err");
  }
})();
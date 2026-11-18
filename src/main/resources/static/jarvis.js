const userInput = document.getElementById('user');
const passInput = document.getElementById('pass');
const questionInput = document.getElementById('question');
const answerOutput = document.getElementById('answer');
const statusOutput = document.getElementById('status');
const speakButton = document.getElementById('speak');
const sendButton = document.getElementById('send');
const stopButton = document.getElementById('stop');
const historyList = document.getElementById('history');
const orbLabel = document.getElementById('orbLabel');
const clockEl = document.getElementById('clock');
const connStatus = document.getElementById('connStatus');

const orbCanvas = document.getElementById('orbCanvas');
const waveCanvas = document.getElementById('waveCanvas');
const orbCtx = orbCanvas.getContext('2d');
const waveCtx = waveCanvas.getContext('2d');

let conversationId = sessionStorage.getItem('jarvisConversationId');
if (!conversationId) {
  conversationId = crypto.randomUUID();
  sessionStorage.setItem('jarvisConversationId', conversationId);
}
document.getElementById('convStatus').textContent = 'conv: ' + conversationId.slice(0, 8);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
speakButton.disabled = !SpeechRecognition;

// ---------- State machine ----------
const STATE = { IDLE: 'IDLE', LISTENING: 'LISTENING', THINKING: 'THINKING', SPEAKING: 'SPEAKING' };
let state = STATE.IDLE;
function setState(s, label) {
  state = s;
  orbLabel.textContent = label || s;
  statusOutput.textContent = label || s;
  if (s === STATE.IDLE) orbLabel.textContent = 'EN ESPERA';
}

// ---------- Clock ----------
setInterval(() => {
  const d = new Date();
  clockEl.textContent = d.toLocaleTimeString('es-ES', { hour12: false });
}, 1000);

// ---------- Canvas sizing ----------
function resizeCanvas(c) {
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, Math.floor(r.width * devicePixelRatio));
  c.height = Math.max(1, Math.floor(r.height * devicePixelRatio));
  const ctx = c.getContext('2d');
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
function resizeAll() { resizeCanvas(orbCanvas); resizeCanvas(waveCanvas); }
window.addEventListener('resize', resizeAll);
resizeAll();

// ---------- Orb animation ----------
let orbPulse = 0;
let orbTarget = 0.3;
function drawOrb() {
  const w = orbCanvas.width / devicePixelRatio;
  const h = orbCanvas.height / devicePixelRatio;
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.32;
  orbCtx.clearRect(0, 0, w, h);

  // rings
  const t = Date.now() / 1000;
  orbPulse += (orbTarget - orbPulse) * 0.08;
  for (let i = 0; i < 3; i++) {
    const rr = r + i * 18 + Math.sin(t * 2 + i) * 4;
    orbCtx.beginPath();
    orbCtx.arc(cx, cy, rr, 0, Math.PI * 2);
    orbCtx.strokeStyle = `rgba(0,229,255,${0.15 - i * 0.04})`;
    orbCtx.lineWidth = 1;
    orbCtx.stroke();
  }

  // core gradient
  const grad = orbCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
  let color = '0,229,255';
  if (state === STATE.LISTENING) color = '255,179,0';
  if (state === STATE.THINKING) color = '120,200,255';
  if (state === STATE.SPEAKING) color = '0,255,170';
  grad.addColorStop(0, `rgba(${color}, ${0.9 * orbPulse + 0.2})`);
  grad.addColorStop(0.6, `rgba(${color}, 0.25)`);
  grad.addColorStop(1, `rgba(${color}, 0)`);
  orbCtx.fillStyle = grad;
  orbCtx.beginPath();
  orbCtx.arc(cx, cy, r, 0, Math.PI * 2);
  orbCtx.fill();

  // rotating ticks
  orbCtx.save();
  orbCtx.translate(cx, cy);
  orbCtx.rotate(t * 0.6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    orbCtx.beginPath();
    orbCtx.moveTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
    orbCtx.lineTo(Math.cos(a) * (r + 14), Math.sin(a) * (r + 14));
    orbCtx.strokeStyle = `rgba(${color},0.6)`;
    orbCtx.lineWidth = 2;
    orbCtx.stroke();
  }
  orbCtx.restore();

  requestAnimationFrame(drawOrb);
}
drawOrb();

// ---------- Waveform ----------
let audioCtx, analyser, micStream, waveData;
async function startMicViz() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    const src = audioCtx.createMediaStreamSource(micStream);
    src.connect(analyser);
    waveData = new Uint8Array(analyser.frequencyBinCount);
  } catch (e) {
    console.warn('Mic viz unavailable', e);
  }
}
function stopMicViz() {
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();
  micStream = null; audioCtx = null; analyser = null; waveData = null;
}
function drawWave() {
  const w = waveCanvas.width / devicePixelRatio;
  const h = waveCanvas.height / devicePixelRatio;
  waveCtx.clearRect(0, 0, w, h);
  waveCtx.strokeStyle = 'rgba(0,229,255,0.7)';
  waveCtx.lineWidth = 1.5;
  waveCtx.beginPath();
  if (analyser && waveData) {
    analyser.getByteTimeDomainData(waveData);
    const step = w / waveData.length;
    for (let i = 0; i < waveData.length; i++) {
      const v = waveData[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) waveCtx.moveTo(0, y); else waveCtx.lineTo(i * step, y);
    }
  } else {
    waveCtx.moveTo(0, h / 2);
    waveCtx.lineTo(w, h / 2);
  }
  waveCtx.stroke();
  requestAnimationFrame(drawWave);
}
drawWave();

// ---------- Typing effect ----------
function typeText(el, text) {
  el.textContent = '';
  let i = 0;
  const speed = 12;
  return new Promise(resolve => {
    const timer = setInterval(() => {
      el.textContent += text.charAt(i);
      i++;
      if (i >= text.length) { clearInterval(timer); resolve(); }
    }, speed);
  });
}

// ---------- Ask ----------
async function ask(text) {
  if (!text || !text.trim()) return;
  if (!userInput.value || !passInput.value) {
    setStatus('Ingresa usuario y contraseña');
    return;
  }
  setState(STATE.THINKING, 'PROCESANDO');
  orbTarget = 0.9;
  setStatus('Consultando...');
  try {
    const url = '/jarvis/ask?q=' + encodeURIComponent(text)
      + '&conversationId=' + encodeURIComponent(conversationId);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(userInput.value + ':' + passInput.value) }
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    answerOutput.textContent = '';
    await typeText(answerOutput, data.answer || '');
    addToHistory(text, data.answer || '');
    setState(STATE.SPEAKING, 'RESPONDIENDO');
    talk(data.answer);
  } catch (error) {
    setStatus('Error: ' + error.message);
    setState(STATE.IDLE, 'ERROR');
    orbTarget = 0.3;
  }
}

function setStatus(text) { statusOutput.textContent = text; }

function talk(text) {
  if (!('speechSynthesis' in window) || !text) { finishSpeak(); return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 1;
  utterance.onend = finishSpeak;
  utterance.onerror = finishSpeak;
  speechSynthesis.speak(utterance);
}
function finishSpeak() {
  setState(STATE.IDLE, 'EN ESPERA');
  orbTarget = 0.3;
}

function addToHistory(q, a) {
  const li = document.createElement('li');
  li.textContent = q.slice(0, 60);
  li.title = a;
  li.addEventListener('click', () => { questionInput.value = q; });
  historyList.prepend(li);
  while (historyList.children.length > 12) historyList.removeChild(historyList.lastChild);
}

// ---------- Speech recognition ----------
let recognition = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    questionInput.value = transcript;
    if (event.results[event.results.length - 1].isFinal) {
      ask(transcript);
    }
  };
  recognition.onerror = (event) => setStatus('Error de voz: ' + event.error);
  recognition.onend = () => {
    if (state === STATE.LISTENING) finishSpeak();
  };
  speakButton.addEventListener('click', async () => {
    await startMicViz();
    setState(STATE.LISTENING, 'ESCUCHANDO');
    orbTarget = 1.0;
    try { recognition.start(); } catch (e) {}
  });
} else {
  setStatus('Voz no disponible en este navegador');
}

sendButton.addEventListener('click', () => ask(questionInput.value));
questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ask(questionInput.value);
});
stopButton.addEventListener('click', () => {
  if (recognition) try { recognition.stop(); } catch (e) {}
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  stopMicViz();
  finishSpeak();
  setStatus('Detenido');
});

// ---------- Connection check ----------
async function checkConn() {
  try {
    const r = await fetch('/', { method: 'GET' });
    connStatus.textContent = r.ok ? 'ONLINE' : 'OFFLINE';
    connStatus.classList.toggle('pill--ok', r.ok);
  } catch (e) {
    connStatus.textContent = 'OFFLINE';
    connStatus.classList.remove('pill--ok');
  }
}
checkConn();
setInterval(checkConn, 15000);
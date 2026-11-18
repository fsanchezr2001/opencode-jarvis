const userInput = document.getElementById('user');
const passInput = document.getElementById('pass');
const questionInput = document.getElementById('question');
const answerOutput = document.getElementById('answer');
const statusOutput = document.getElementById('status');
const speakButton = document.getElementById('speak');
const sendButton = document.getElementById('send');
const stopButton = document.getElementById('stop');

let conversationId = sessionStorage.getItem('jarvisConversationId');
if (!conversationId) {
  conversationId = crypto.randomUUID();
  sessionStorage.setItem('jarvisConversationId', conversationId);
}

function setStatus(text) {
  statusOutput.textContent = text;
}

function talk(text) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
}

async function ask(text) {
  if (!text || !text.trim()) return;
  if (!userInput.value || !passInput.value) {
    setStatus('Ingresa usuario y contraseña');
    return;
  }

  setStatus('Consultando...');
  try {
    const url = '/jarvis/ask?q=' + encodeURIComponent(text)
      + '&conversationId=' + encodeURIComponent(conversationId);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(userInput.value + ':' + passInput.value)
      }
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    answerOutput.textContent = data.answer || '';
    setStatus('Listo');
    talk(data.answer);
  } catch (error) {
    setStatus('Error: ' + error.message);
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
speakButton.disabled = !SpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    questionInput.value = text;
    ask(text);
  };
  recognition.onerror = (event) => setStatus('Error de voz: ' + event.error);
  recognition.onend = () => setStatus('Listo');

  speakButton.addEventListener('click', () => {
    setStatus('Escuchando...');
    recognition.start();
  });
} else {
  setStatus('Voz no disponible en este navegador');
}

sendButton.addEventListener('click', () => ask(questionInput.value));
stopButton.addEventListener('click', () => {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  setStatus('Detenido');
});

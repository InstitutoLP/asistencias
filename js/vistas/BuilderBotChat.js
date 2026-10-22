document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('builderbotToggle');
  const chatWindow = document.getElementById('builderbotWindow');
  const closeButton = document.getElementById('builderbotClose');
  const form = document.getElementById('builderbotForm');
  const sendButton = document.getElementById('builderbotSend');
  const messageInput = document.getElementById('builderbotInput');
  const messagesContainer = document.getElementById('builderbotMessages');
  if (!toggleButton || !chatWindow || !closeButton || !form || !sendButton
    || !messageInput || !messagesContainer) return;

  const getDemoReply = (content) => {
    const message = content.toLocaleLowerCase();
    if (/\b(hola|buenos días|buenas tardes|buenas noches)\b/.test(message)) {
      return '¡Hola! Gracias por escribirnos. Este chat está en modo de demostración local.';
    }
    if (/\b(nota|notas|calificación|calificaciones)\b/.test(message)) {
      return 'Para consultar tus calificaciones, ingresa tu cédula en el portal estudiantil. Esta es una respuesta simulada.';
    }
    if (/\b(asistencia|inasistencia)\b/.test(message)) {
      return 'Puedes consultar la información de asistencia en tu boleta del portal estudiantil. Esta es una respuesta simulada.';
    }
    return 'Gracias por tu mensaje. Esta es una respuesta automática de demostración; no proviene del bot real.';
  };

  const setOpen = (open) => {
    chatWindow.hidden = !open;
    toggleButton.setAttribute('aria-expanded', String(open));
    if (open) messageInput.focus();
  };

  const appendMessage = (text, type) => {
    const message = document.createElement('div');
    message.className = `builderbot-message builderbot-message-${type}`;
    message.textContent = text;
    messagesContainer.appendChild(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  toggleButton.addEventListener('click', () => setOpen(chatWindow.hidden));
  closeButton.addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const content = messageInput.value.trim();
    if (!content) return;

    appendMessage(content, 'user');
    messageInput.value = '';
    sendButton.disabled = true;
    setTimeout(() => {
      appendMessage(getDemoReply(content), 'assistant');
      sendButton.disabled = false;
      messageInput.focus();
    }, 700);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('builderbotToggle');
  const chatWindow = document.getElementById('builderbotWindow');
  const closeButton = document.getElementById('builderbotClose');
  const form = document.getElementById('builderbotForm');
  const sendButton = document.getElementById('builderbotSend');
  const phoneInput = document.getElementById('builderbotPhone');
  const messageInput = document.getElementById('builderbotInput');
  const messagesContainer = document.getElementById('builderbotMessages');
  if (!toggleButton || !chatWindow || !closeButton || !form || !sendButton
    || !phoneInput || !messageInput || !messagesContainer) return;

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
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const content = messageInput.value.trim();
    const number = phoneInput.value.replace(/\D/g, '');
    if (!content) return;

    appendMessage(content, 'user');
    messageInput.value = '';
    sendButton.disabled = true;
    try {
      const response = await fetch('/api/builderbot-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, content }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
      appendMessage('Tu mensaje fue enviado al asistente.', 'assistant');
    } catch (error) {
      appendMessage(error.message || 'No se pudo enviar el mensaje. Intenta nuevamente.', 'error');
    } finally {
      sendButton.disabled = false;
      messageInput.focus();
    }
  });
});

/**
 * content.js — Script de conteúdo (opcional)
 * Escuta mensagens do background caso seja necessário
 * comunicação bidirecional com a página.
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Reservado para futuras funcionalidades
  // Ex: verificar resultado da renovação no DOM após o clique em Gravar
  if (msg.action === 'checkResult') {
    const toasts = document.querySelectorAll('.Toastify__toast');
    const messages = Array.from(toasts).map(t => t.textContent.trim());
    sendResponse({ messages });
  }
});

/**
 * background.js — BU UFSC Renovação v1.2
 *
 * Novidades v1.2:
 *   - Fecha a aba do Pergamum ao final da renovação
 *   - Agendamento com alarme (chrome.alarms)
 *   - Notificação no dia com botão "Renovar agora"
 *   - Histórico das últimas renovações
 */

const BASE_URL      = 'https://pergamum.ufsc.br';
const LOGIN_URL     = `${BASE_URL}/login?redirect=/meupergamum`;
const RENOVACAO_URL = `${BASE_URL}/meupergamum/renovacao`;
const ALARM_NAME    = 'bu-renovacao-alarm';
const DEFAULT_DAYS  = 10;
const MSG_ACESSO_BLOQUEADO =
  'Acesso ao Pergamum bloqueado (erro 403). A UFSC restringiu temporariamente o acesso ' +
  'à rede da UFSC. Conecte-se à VPN UFSC e tente novamente.';

// ── Boot: restaura alarme ao reiniciar o service worker ───────
chrome.runtime.onStartup.addListener(restoreAlarmIfNeeded);
chrome.runtime.onInstalled.addListener(restoreAlarmIfNeeded);

async function restoreAlarmIfNeeded() {
  const { bu_schedule } = await chrome.storage.local.get('bu_schedule');
  if (bu_schedule?.active && bu_schedule?.nextRenovacao) {
    await scheduleAlarm(bu_schedule.nextRenovacao);
  }
}

// ── Listener de mensagens do popup ────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startRenovacao') {
    runRenovacao(msg.username, msg.password)
      .then(result  => sendResponse(result))
      .catch(err    => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (msg.action === 'saveSchedule') {
    saveSchedule(msg.intervalDays)
      .then(result => sendResponse(result))
      .catch(err   => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (msg.action === 'cancelSchedule') {
    cancelSchedule()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (msg.action === 'getSchedule') {
    chrome.storage.local.get(['bu_schedule', 'bu_history'], (data) => {
      sendResponse({ schedule: data.bu_schedule || null, history: data.bu_history || [] });
    });
    return true;
  }
});

// ── Alarme disparado ──────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  // Envia notificação com botão
  chrome.notifications.create('bu-renovar', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '📚 BU UFSC — Renovação',
    message: 'Hoje é o dia de renovar seus empréstimos!',
    buttons: [{ title: 'Renovar agora' }],
    requireInteraction: true,
    priority: 2
  });
});

// Clique no botão da notificação
chrome.notifications.onButtonClicked.addListener(async (notifId, btnIdx) => {
  if (notifId !== 'bu-renovar' || btnIdx !== 0) return;
  chrome.notifications.clear('bu-renovar');

  // Pega credenciais salvas e renova
  const data = await chrome.storage.local.get(['bu_username', 'bu_password', 'bu_save']);
  if (!data.bu_save || !data.bu_username || !data.bu_password) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'BU UFSC — Ação necessária',
      message: 'Abra a extensão, informe suas credenciais e clique em Renovar.',
    });
    return;
  }

  try {
    const result = await runRenovacao(data.bu_username, data.bu_password);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'BU UFSC — ' + (result.success ? 'Sucesso!' : 'Erro'),
      message: result.message,
    });
  } catch (e) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'BU UFSC — Erro',
      message: e.message,
    });
  }
});

// ── Agendamento ───────────────────────────────────────────────
async function saveSchedule(intervalDays) {
  const nextRenovacao = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
  const schedule = { active: true, intervalDays, nextRenovacao };
  await chrome.storage.local.set({ bu_schedule: schedule });
  await scheduleAlarm(nextRenovacao);
  return { success: true, schedule };
}

async function cancelSchedule() {
  await chrome.alarms.clear(ALARM_NAME);
  const { bu_schedule } = await chrome.storage.local.get('bu_schedule');
  if (bu_schedule) {
    bu_schedule.active = false;
    await chrome.storage.local.set({ bu_schedule });
  }
}

async function scheduleAlarm(timestamp) {
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { when: timestamp });
}

// Reagenda após renovação bem-sucedida
async function rescheduleAfterRenovacao() {
  const { bu_schedule } = await chrome.storage.local.get('bu_schedule');
  if (!bu_schedule?.active) return;
  const nextRenovacao = Date.now() + bu_schedule.intervalDays * 24 * 60 * 60 * 1000;
  bu_schedule.nextRenovacao = nextRenovacao;
  await chrome.storage.local.set({ bu_schedule });
  await scheduleAlarm(nextRenovacao);
}

// ── Histórico ─────────────────────────────────────────────────
async function addToHistory(entry) {
  const { bu_history } = await chrome.storage.local.get('bu_history');
  const history = bu_history || [];
  history.unshift(entry);
  if (history.length > 10) history.pop(); // guarda últimas 10
  await chrome.storage.local.set({ bu_history: history });
}

// ── Orquestrador principal ────────────────────────────────────
async function runRenovacao(username, password) {
  notifyPopup('Verificando acesso ao Pergamum…');
  await checkAcessoPergamum();

  notifyPopup('Abrindo sistema da biblioteca…');
  const tab = await getOrCreateTab();

  notifyPopup('Navegando para a página de login…');
  await navigateTab(tab.id, LOGIN_URL);
  await waitForTabLoad(tab.id);
  await sleep(800);

  notifyPopup('Preenchendo credenciais…');
  const loginResult = await executeInTab(tab.id, doLogin, [username, password]);
  if (!loginResult?.ok) {
    await closeTab(tab.id);
    throw new Error(loginResult?.error || 'Falha ao preencher o formulário de login.');
  }

  notifyPopup('Aguardando autenticação…');
  await waitForUrlMatch(tab.id, '/meupergamum', 15000);

  notifyPopup('Acessando página de renovação…');
  await navigateTab(tab.id, RENOVACAO_URL);
  await waitForTabLoad(tab.id);
  await sleep(1500);

  await executeInTab(tab.id, closeResultModal);

  notifyPopup('Selecionando todos os livros…');
  const renovResult = await executeInTab(tab.id, doRenovacao);

  if (!renovResult?.ok) {
    await closeTab(tab.id);
    throw new Error(renovResult?.error || 'Falha ao realizar a renovação.');
  }

  notifyPopup('Aguardando confirmação…');
  await sleep(2500);
  await executeInTab(tab.id, closeResultModal);

  // Fecha a aba
  await closeTab(tab.id);

  // Registra no histórico e reagenda
  await addToHistory({
    date: new Date().toISOString(),
    message: renovResult.message,
    success: true
  });
  await rescheduleAfterRenovacao();

  return { success: true, message: renovResult.message };
}

// Desde 22/10/2026 a UFSC bloqueia (HTTP 403) o Pergamum fora da rede da UFSC/VPN
async function checkAcessoPergamum() {
  let res;
  try {
    res = await fetch(LOGIN_URL, { cache: 'no-store' });
  } catch (e) {
    throw new Error('Não foi possível conectar ao Pergamum. Verifique sua conexão com a internet.');
  }
  if (res.status === 403) throw new Error(MSG_ACESSO_BLOQUEADO);
}

// ── Funções injetadas nas abas ─────────────────────────────────

function closeResultModal() {
  try {
    const closeBtn = document.querySelector('.modal.show button.close, .modal[style*="display: block"] button.close');
    if (closeBtn) { closeBtn.click(); return { closed: true }; }
    const modal    = document.querySelector('.modal.show, .modal[style*="display: block"]');
    const backdrop = document.querySelector('.modal-backdrop');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('show'); }
    if (backdrop) backdrop.remove();
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = '';
    return { closed: !!modal };
  } catch (e) { return { closed: false, error: e.message }; }
}

function doLogin(username, password) {
  try {
    const userInput = document.getElementById('username');
    const passInput = document.getElementById('password');
    if (!userInput || !passInput) {
      if (document.title.includes('403')) {
        return { ok: false, error: 'Acesso ao Pergamum bloqueado (erro 403). Conecte-se à VPN UFSC e tente novamente.' };
      }
      return { ok: false, error: `Campos de login não encontrados (URL: ${location.href}). Tente novamente.` };
    }
    function setNativeValue(el, value) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setNativeValue(userInput, username);
    setNativeValue(passInput, password);
    const select = document.querySelector('select.form-control');
    if (select && select.value !== 'M') {
      select.value = 'M';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const btnAcessar = Array.from(document.querySelectorAll('button.btn-generic--primeiro'))
      .find(b => b.textContent.includes('Acessar'));
    if (!btnAcessar) return { ok: false, error: 'Botão "Acessar" não encontrado.' };
    btnAcessar.click();
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

function doRenovacao() {
  try {
    const checkboxes = document.querySelectorAll('input[id^="chk-"]');
    if (checkboxes.length === 0) {
      return { ok: true, message: 'Nenhum livro disponível para renovação no momento.' };
    }
    const headerCb = document.querySelector('.tabela .row:first-child input[type="checkbox"]');
    if (headerCb && !headerCb.checked) headerCb.click();
    checkboxes.forEach(chk => { if (!chk.checked) chk.click(); });
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const btns = Array.from(document.querySelectorAll('button.btn-generic--primeiro'));
        const btnGravar = btns.find(b => b.textContent.includes('Gravar') && !b.disabled);
        if (btnGravar) {
          clearInterval(interval);
          btnGravar.click();
          resolve({ ok: true, message: `✅ ${checkboxes.length} livro(s) renovado(s) com sucesso!` });
        } else if (attempts > 20) {
          clearInterval(interval);
          const existe = btns.find(b => b.textContent.includes('Gravar'));
          resolve({ ok: false, error: existe
            ? 'Botão "Gravar" desabilitado. Os livros podem não estar disponíveis para renovação agora.'
            : 'Botão "Gravar" não encontrado.' });
        }
      }, 150);
    });
  } catch (e) { return { ok: false, error: e.message }; }
}

// ── Utilitários ───────────────────────────────────────────────
function notifyPopup(message) {
  chrome.runtime.sendMessage({ action: 'progress', message }).catch(() => {});
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function closeTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.remove(tabId, () => { resolve(); });
  });
}

async function getOrCreateTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: 'https://pergamum.ufsc.br/*' }, (tabs) => {
      if (tabs.length > 0) resolve(tabs[0]);
      else chrome.tabs.create({ url: LOGIN_URL, active: true }, resolve);
    });
  });
}

function navigateTab(tabId, url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, { url, active: true }, (tab) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(tab);
    });
  });
}

function waitForTabLoad(tabId, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Timeout aguardando a página carregar.'));
    }, timeout);
    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function waitForUrlMatch(tabId, urlFragment, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Timeout aguardando autenticação. Verifique suas credenciais.'));
    }, timeout);
    function listener(id, info, tab) {
      if (id === tabId && info.status === 'complete' && tab.url?.includes(urlFragment)) {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function executeInTab(tabId, fn, args = []) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      { target: { tabId }, func: fn, args, world: 'MAIN' },
      (results) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(results?.[0]?.result);
      }
    );
  });
}

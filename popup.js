// ── Elementos ─────────────────────────────────────────────────
const usernameEl    = document.getElementById('username');
const passwordEl    = document.getElementById('password');
const saveCheckEl   = document.getElementById('save-credentials');
const btnRenovar    = document.getElementById('btn-renovar');
const btnLimpar     = document.getElementById('btn-limpar');
const btnIcon       = document.getElementById('btn-icon');
const btnText       = document.getElementById('btn-text');
const statusBox     = document.getElementById('status-box');
const togglePassBtn = document.getElementById('toggle-pass');

// Agendamento
const countdownWrap  = document.getElementById('countdown-wrap');
const countdownBox   = document.getElementById('countdown-box');
const cdTime         = document.getElementById('cd-time');
const cdSub          = document.getElementById('cd-sub');
const cdEditBtn      = document.getElementById('cd-edit-btn');
const cdCancelBtn    = document.getElementById('cd-cancel-btn');
const scheduleForm   = document.getElementById('schedule-form');
const intervalInput  = document.getElementById('interval-days');
const btnAgendar     = document.getElementById('btn-agendar');
const historyList    = document.getElementById('history-list');

// ── Abas ──────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'historico') renderHistory();
    if (btn.dataset.tab === 'agenda')    loadSchedule();
  });
});

// ── Mostrar/ocultar senha ─────────────────────────────────────
togglePassBtn.addEventListener('click', () => {
  const isPwd = passwordEl.type === 'password';
  passwordEl.type = isPwd ? 'text' : 'password';
  togglePassBtn.textContent = isPwd ? '🙈' : '👁';
});

// ── Carregar credenciais ───────────────────────────────────────
chrome.storage.local.get(['bu_username', 'bu_password', 'bu_save'], (data) => {
  if (data.bu_save) {
    usernameEl.value    = data.bu_username || '';
    passwordEl.value    = data.bu_password || '';
    saveCheckEl.checked = true;
    btnLimpar.style.display = 'block';
  }
});

btnLimpar.addEventListener('click', () => {
  chrome.storage.local.remove(['bu_username', 'bu_password', 'bu_save'], () => {
    usernameEl.value = '';
    passwordEl.value = '';
    saveCheckEl.checked = false;
    btnLimpar.style.display = 'none';
    showStatus('Credenciais removidas.', 'info');
  });
});

// ── Renovar ───────────────────────────────────────────────────
btnRenovar.addEventListener('click', () => {
  const username = usernameEl.value.trim();
  const password = passwordEl.value;
  if (!username || !password) { showStatus('Preencha a matrícula e a senha.', 'error'); return; }

  if (saveCheckEl.checked) {
    chrome.storage.local.set({ bu_username: username, bu_password: password, bu_save: true });
    btnLimpar.style.display = 'block';
  }

  setLoading(true);
  showStatus('Iniciando renovação…', 'info');

  chrome.runtime.sendMessage({ action: 'startRenovacao', username, password }, (response) => {
    setLoading(false);
    if (chrome.runtime.lastError) { showStatus('Erro de comunicação. Tente novamente.', 'error'); return; }
    if (response?.success) {
      showStatus(response.message || 'Renovação concluída!', 'success');
    } else {
      showStatus(response?.message || 'Erro durante a renovação.', 'error');
    }
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'progress') showStatus(msg.message, 'info');
});

// ── Agendamento ───────────────────────────────────────────────

// Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    intervalInput.value = btn.dataset.days;
  });
});

intervalInput.addEventListener('input', () => {
  document.querySelectorAll('.preset-btn').forEach(b => {
    b.classList.toggle('sel', b.dataset.days === intervalInput.value);
  });
});

function loadSchedule() {
  chrome.runtime.sendMessage({ action: 'getSchedule' }, (resp) => {
    if (!resp) return;
    const schedule = resp.schedule;
    if (schedule?.active && schedule?.nextRenovacao) {
      showCountdown(schedule);
    } else {
      showScheduleForm();
    }
  });
}

function showCountdown(schedule) {
  countdownWrap.style.display = 'block';
  scheduleForm.classList.remove('visible');
  updateCountdown(schedule.nextRenovacao);
}

function showScheduleForm() {
  countdownWrap.style.display = 'none';
  scheduleForm.classList.add('visible');
}

function updateCountdown(nextTs) {
  const diff = nextTs - Date.now();
  if (diff <= 0) {
    cdTime.textContent = 'Hoje!';
    cdSub.textContent  = 'Abra a aba Renovar e renove agora.';
    countdownBox.classList.add('urgent');
    return;
  }

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    cdTime.textContent = `${days} dia${days > 1 ? 's' : ''}`;
    cdSub.textContent  = `e ${hours}h ${minutes}min`;
  } else if (hours > 0) {
    cdTime.textContent = `${hours}h ${minutes}min`;
    cdSub.textContent  = 'Renovação é hoje!';
    countdownBox.classList.add('urgent');
  } else {
    cdTime.textContent = `${minutes} min`;
    cdSub.textContent  = 'Renovação é agora!';
    countdownBox.classList.add('urgent');
  }

  const nextDate = new Date(nextTs);
  cdSub.textContent += ` · ${nextDate.toLocaleDateString('pt-BR')}`;
}

cdEditBtn.addEventListener('click', showScheduleForm);

cdCancelBtn.addEventListener('click', () => {
  if (!confirm('Cancelar o agendamento automático?')) return;
  chrome.runtime.sendMessage({ action: 'cancelSchedule' }, () => {
    showScheduleForm();
  });
});

btnAgendar.addEventListener('click', () => {
  const days = parseInt(intervalInput.value);
  if (!days || days < 1 || days > 29) {
    alert('Informe um intervalo entre 1 e 29 dias.');
    return;
  }
  chrome.runtime.sendMessage({ action: 'saveSchedule', intervalDays: days }, (resp) => {
    if (resp?.success) {
      showCountdown(resp.schedule);
    }
  });
});

// ── Histórico ─────────────────────────────────────────────────
function renderHistory() {
  chrome.runtime.sendMessage({ action: 'getSchedule' }, (resp) => {
    const history = resp?.history || [];
    if (history.length === 0) {
      historyList.innerHTML = '<li class="empty-msg">Nenhuma renovação registrada ainda.</li>';
      return;
    }
    historyList.innerHTML = history.map(item => {
      const date = new Date(item.date);
      const dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `
        <li class="history-item">
          <div class="history-dot ${item.success ? 'ok' : 'err'}"></div>
          <div>
            <div class="history-msg">${item.message}</div>
            <div class="history-date">${dateStr}</div>
          </div>
        </li>`;
    }).join('');
  });
}

// ── Helpers ───────────────────────────────────────────────────
function setLoading(loading) {
  btnRenovar.disabled = loading;
  if (loading) {
    btnIcon.innerHTML = '<span class="spinner"></span>';
    btnText.textContent = 'Aguarde…';
  } else {
    btnIcon.textContent = '🔄';
    btnText.textContent = 'Renovar Todos os Livros';
  }
}

function showStatus(message, type) {
  statusBox.textContent    = message;
  statusBox.className      = type;
  statusBox.style.display  = 'block';
}

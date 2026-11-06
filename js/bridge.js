/**
 * Файл: js/bridge.js
 * Версия: 2.1.0
 * Описание: uiConfirm/uiAlert строятся через DOM API, без HTML-инъекций.
 */

export const tg = window.WebApp || window.Telegram?.WebApp;
export const IS_MAX = !!tg;

export const haptic = (type = 'light') => { try { tg?.HapticFeedback?.impactOccurred?.(type); } catch(_) {} };
export const hapticNotify = (type = 'success') => { try { tg?.HapticFeedback?.notificationOccurred?.(type); } catch(_) {} };

let uiConfirmRunning = false;

function buildDialogCard() {
  const card = document.createElement('div');
  card.className = 'modal';
  card.style.cssText = 'border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-width: 320px; padding: 24px; text-align: center; background: var(--surface); animation: scaleUp 0.2s var(--spring);';
  return card;
}

function buildMessage(text) {
  const p = document.createElement('p');
  p.style.cssText = 'margin-bottom: 20px; font-size: 16px; line-height: 1.4; font-weight: 500; white-space: pre-wrap;';
  p.textContent = String(text ?? '');
  return p;
}

export function uiConfirm(msg) {
  if (uiConfirmRunning) return Promise.resolve(false);
  uiConfirmRunning = true;
  return new Promise(res => {
    let settled = false;
    const done = v => {
      if (settled) return;
      settled = true;
      uiConfirmRunning = false;
      res(v);
    };
    if (IS_MAX && tg?.showConfirm) {
      try { tg.showConfirm(msg, done); return; } catch(_) {}
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.style.zIndex = '9999';
    overlay.style.alignItems = 'center';
    overlay.style.padding = '20px';

    const card = buildDialogCard();
    card.appendChild(buildMessage(msg));

    const btns = document.createElement('div');
    btns.style.cssText = 'display: flex; gap: 8px;';

    const cancel = document.createElement('button');
    cancel.className = 'btn btn-secondary';
    cancel.style.cssText = 'padding: 12px; flex: 1; font-size: 15px;';
    cancel.textContent = 'Отмена';
    cancel.onclick = () => { overlay.remove(); done(false); };

    const ok = document.createElement('button');
    ok.className = 'btn btn-primary';
    ok.style.cssText = 'padding: 12px; flex: 1; font-size: 15px;';
    ok.textContent = 'ОК';
    ok.onclick = () => { overlay.remove(); done(true); };

    btns.append(cancel, ok);
    card.appendChild(btns);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}

export function uiAlert(msg) {
  if (IS_MAX && tg?.showAlert) { try { tg.showAlert(msg); return; } catch(_) {} }

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.style.zIndex = '9999';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '20px';

  const card = buildDialogCard();
  card.appendChild(buildMessage(msg));

  const ok = document.createElement('button');
  ok.className = 'btn btn-primary';
  ok.style.cssText = 'padding: 12px; font-size: 15px;';
  ok.textContent = 'ОК';
  ok.onclick = () => overlay.remove();

  card.appendChild(ok);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

export function enableCloseConfirm() {
  if (IS_MAX && tg?.enableClosingConfirmation) {
    try { tg.enableClosingConfirmation(); } catch(_) {}
  }
}

export function disableCloseConfirm() {
  if (IS_MAX && tg?.disableClosingConfirmation) {
    try { tg.disableClosingConfirmation(); } catch(_) {}
  }
}

export function closeApp() {
  if (IS_MAX) {
    if (typeof tg?.close === 'function') {
      try { tg.close(); return true; } catch(_) {}
    }
    if (typeof tg?.closeWebApp === 'function') {
      try { tg.closeWebApp(); return true; } catch(_) {}
    }
  }
  try {
    window.close();
    return true;
  } catch(_) {}
  return false;
}

export function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--bg', '#09090B');
  root.style.setProperty('--surface', '#141417');
  root.style.setProperty('--surface-hover', '#1C1C21');
  root.style.setProperty('--text-main', '#FFFFFF');
  root.style.setProperty('--text-muted', '#8E8E93');
  root.style.setProperty('--border', '1px solid rgba(255, 255, 255, 0.08)');
  try { tg?.setHeaderColor?.('#09090B'); tg?.setBackgroundColor?.('#09090B'); } catch(_) {}
}

if (tg) {
  try {
    tg.ready?.();
    tg.expand?.();
    applyTheme();
  } catch(_) {}
}

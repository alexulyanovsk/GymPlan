/**
 * Файл: js/bridge.js
 * Версия: 1.4.0
 * Описание: Кастомные модальные окна вместо стандартных alert/confirm.
 */

export const tg = window.WebApp || window.Telegram?.WebApp;
export const IS_MAX = !!tg;

export const haptic = (type = 'light') => { try { tg?.HapticFeedback?.impactOccurred?.(type); } catch(_) {} };
export const hapticNotify = (type = 'success') => { try { tg?.HapticFeedback?.notificationOccurred?.(type); } catch(_) {} };

let uiConfirmRunning = false;
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
    
    // Кастомный UI
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.style.zIndex = '9999';
    overlay.style.alignItems = 'center';
    overlay.style.padding = '20px';
    
    overlay.innerHTML = `
      <div class="modal" style="border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-width: 320px; padding: 24px; text-align: center; background: var(--surface); animation: scaleUp 0.2s var(--spring);">
        <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.4; font-weight: 500;">${msg}</p>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" style="padding: 12px; flex: 1; font-size: 15px;" id="uiConfirmCancel">Отмена</button>
          <button class="btn btn-primary" style="padding: 12px; flex: 1; font-size: 15px;" id="uiConfirmOk">ОК</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    const close = (val) => { overlay.remove(); done(val); };
    overlay.querySelector('#uiConfirmCancel').onclick = () => close(false);
    overlay.querySelector('#uiConfirmOk').onclick = () => close(true);
  });
}

export function uiAlert(msg) {
  if (IS_MAX && tg?.showAlert) { try { tg.showAlert(msg); return; } catch(_) {} }
  
  // Кастомный UI
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.style.zIndex = '9999';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '20px';
  
  overlay.innerHTML = `
    <div class="modal" style="border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-width: 320px; padding: 24px; text-align: center; background: var(--surface); animation: scaleUp 0.2s var(--spring);">
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.4; font-weight: 500;">${msg}</p>
      <button class="btn btn-primary" style="padding: 12px; font-size: 15px;" id="uiAlertOk">ОК</button>
    </div>
  `;
  document.body.appendChild(overlay);
  
  overlay.querySelector('#uiAlertOk').onclick = () => overlay.remove();
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
  const isLight = tg?.colorScheme === 'light';
  if (isLight) {
    root.style.setProperty('--bg', '#F2F2F7'); 
    root.style.setProperty('--surface', '#FFFFFF');
    root.style.setProperty('--surface-hover', '#F9F9FB');
    root.style.setProperty('--text-main', '#000000');
    root.style.setProperty('--text-muted', '#8E8E93');
    root.style.setProperty('--border', '1px solid rgba(0, 0, 0, 0.08)');
    try { tg?.setHeaderColor?.('#F2F2F7'); tg?.setBackgroundColor?.('#F2F2F7'); } catch(_) {}
  } else {
    root.style.setProperty('--bg', '#09090B');
    root.style.setProperty('--surface', '#141417');
    root.style.setProperty('--surface-hover', '#1C1C21');
    root.style.setProperty('--text-main', '#FFFFFF');
    root.style.setProperty('--text-muted', '#8E8E93');
    root.style.setProperty('--border', '1px solid rgba(255, 255, 255, 0.08)');
    try { tg?.setHeaderColor?.('#09090B'); tg?.setBackgroundColor?.('#09090B'); } catch(_) {}
  }
}

if (tg) {
  try { tg.ready?.(); tg.expand?.(); applyTheme(); tg.onEvent?.('themeChanged', applyTheme); } catch(_) {}
}

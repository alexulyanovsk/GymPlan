/**
 * Файл: js/bridge.js
 * Версия: 1.3.0
 * Описание: Обновлена палитра под новый дизайн 2027.
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
    try { done(window.confirm(msg)); } catch(_) { done(false); }
  });
}

export function uiAlert(msg) {
  if (IS_MAX && tg?.showAlert) { try { tg.showAlert(msg); return; } catch(_) {} }
  try { alert(msg); } catch(_) {}
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

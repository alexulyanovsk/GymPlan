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

export function applyTheme() {
  const root = document.documentElement;
  const isLight = tg?.colorScheme === 'light';
  if (isLight) {
    root.style.setProperty('--b', '#e5e5ea'); root.style.setProperty('--t', '#000000');
    root.style.setProperty('--d', '#6b7280');
    root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.65)');
    root.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--i', '#ffffff');
    root.style.setProperty('--bg-img', 'radial-gradient(circle at top left, #fdfbfb, #ebedee)');
    try { tg?.setHeaderColor?.('#e5e5ea'); tg?.setBackgroundColor?.('#e5e5ea'); } catch(_) {}
  } else {
    root.style.setProperty('--b', '#0f0f11'); root.style.setProperty('--t', '#ffffff');
    root.style.setProperty('--d', '#8b96a5');
    root.style.setProperty('--glass-bg', 'rgba(30, 30, 35, 0.65)');
    root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--i', '#1c1c21');
    root.style.setProperty('--bg-img', 'radial-gradient(circle at top left, #1a1a24, #0f0f11)');
    try { tg?.setHeaderColor?.('#0f0f11'); tg?.setBackgroundColor?.('#0f0f11'); } catch(_) {}
  }
}

if (tg) {
  try { tg.ready?.(); tg.expand?.(); applyTheme(); tg.onEvent?.('themeChanged', applyTheme); } catch(_) {}
}

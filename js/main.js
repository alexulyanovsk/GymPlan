/**
 * Файл: js/main.js
 * Версия: 2.0.0
 * Описание: Корректный fatal-error, безопасная загрузка, защита от double-back.
 */

import { loadState, saveState, flushNow, importData, state } from './state.js';
import { render, ACTIONS, renderLibraryList, initBridgeEvents, handleBack } from './ui.js';
import { uiConfirm, uiAlert, closeApp } from './bridge.js';
import { LIMITS } from './data.js';

function showFatalError(err) {
  console.error('[GymPlan Fatal]', err);
  const app = document.getElementById('app');
  if (!app) return;
  app.className = '';
  app.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:20px;color:#FF6B6B;font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;';
  wrap.textContent = 'Ошибка запуска:\n' + (err?.message || String(err)) + '\n\n' + (err?.stack || '');
  app.appendChild(wrap);
}

window.addEventListener('error', e => showFatalError(e.error || new Error(String(e.message))));
window.addEventListener('unhandledrejection', e => showFatalError(e.reason));

document.body.addEventListener('click', ev => {
  if (ev.target.id === 'addDialogBackdrop') { ACTIONS.closeAddDialog(); return; }
  if (ev.target.id === 'newDayDialogBackdrop') { ACTIONS.closeNewDay(); return; }
  if (ev.target.id === 'csvModalBackdrop') { ACTIONS.closeCsvModal(); return; }
  const el = ev.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el);
});

document.addEventListener('error', ev => {
  const t = ev.target;
  if (t && t.tagName === 'IMG' && t.parentElement?.classList.contains('gif-block')) {
    t.style.display = 'none';
    t.parentElement.classList.add('no-gif');
  }
}, true);

let searchDebounceTimer = null;
document.body.addEventListener('input', ev => {
  if (ev.target.id === 'newDayNameInput') state.newDayName = ev.target.value;
  if (ev.target.id === 'searchInput' && state.screen === 'library') {
    state.libSearch = ev.target.value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      const list = document.getElementById('libList');
      if (list) list.innerHTML = renderLibraryList();
      saveState();
    }, LIMITS.searchDebounceMs);
  }
});

document.body.addEventListener('keydown', ev => {
  if (ev.target.id === 'newDayNameInput' && ev.key === 'Enter') { ev.preventDefault(); ACTIONS.createNewDay(); }
});

document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await importData(file);
    render();
  } catch (err) {
    alert('Ошибка импорта: ' + (err?.message || 'неверный формат файла'));
  }
  e.target.value = '';
});

function emergencySave() {
  try {
    const ts = Date.now();
    state._lastSavedTs = ts;
    localStorage.setItem('gymplan_emergency', JSON.stringify({
      plans: state.plans, screen: state.screen, currentDayId: state.currentDayId,
      workout: state.workout, history: state.history, weights: state.weights,
      lastCompletedTs: state.lastCompletedTs, _lastSavedTs: ts
    }));
  } catch(_) {}
}

window.addEventListener('beforeunload', () => { emergencySave(); flushNow(); });
window.addEventListener('pagehide', () => { emergencySave(); flushNow(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { emergencySave(); flushNow(); }
});

let lastBackPress = 0;
let backHandling = false;
const DOUBLE_BACK_MS = 2000;

function setupBackHandler() {
  try {
    history.replaceState({ gymplan: true }, '');
    history.pushState({ gymplan: true }, '');
  } catch(e) { console.warn('[GymPlan] History API недоступен:', e); }

  window.addEventListener('popstate', async () => {
    // Не обрабатываем повторный popstate, пока открыт confirm или идёт обработка
    if (backHandling) return;

    if (handleBack()) {
      try { history.pushState({ gymplan: true }, ''); } catch(_) {}
      return;
    }

    try { history.pushState({ gymplan: true }, ''); } catch(_) {}

    const now = Date.now();
    if (now - lastBackPress < DOUBLE_BACK_MS) {
      lastBackPress = 0;
      const closed = closeApp();
      if (!closed) uiAlert('Закройте приложение через меню устройства');
      return;
    }

    backHandling = true;
    lastBackPress = now;
    const ok = await uiConfirm('Выйти из GymPlan?');
    backHandling = false;
    lastBackPress = 0;

    if (ok) {
      const closed = closeApp();
      if (!closed) uiAlert('Закройте приложение через меню устройства');
    }
  });
}

let swReloading = false;
function setupServiceWorkerUpdates() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then(reg => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });
      setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
    })
    .catch(err => console.log('SW registration failed: ', err));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swReloading) return;
    // Не перезагружаем на первом контроллере (первая установка SW)
    const firstInstall = !navigator.serviceWorker.controller;
    if (firstInstall) return;
    if (state.screen === 'workout' || state.rest) {
      console.log('[GymPlan] Обновление готово. Применится после завершения тренировки.');
      return;
    }
    swReloading = true;
    window.location.reload();
  });
}

(async function init() {
  try {
    initBridgeEvents();
    setupBackHandler();

    let loadErr = null;
    try {
      await Promise.race([
        loadState(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('loadState timeout')), 5000))
      ]);
    } catch(e) {
      loadErr = e;
      console.warn('[GymPlan] loadState failed:', e);
    }

    render();

    if (!loadErr) {
      setupServiceWorkerUpdates();
    }

    window.__GYMPLAN_LOADED = true;
  } catch (err) {
    showFatalError(err);
  }
})();

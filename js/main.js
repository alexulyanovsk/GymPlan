/**
 * Файл: js/main.js
 * Версия: 1.4.0
 * Описание: Добавлено аварийное сохранение при закрытии и защита от потери данных.
 */

import { loadState, saveState, flushNow, importData, state } from './state.js';
import { render, ACTIONS, renderLibraryList, initBridgeEvents, handleBack } from './ui.js';
import { uiConfirm, uiAlert, closeApp } from './bridge.js';

window.__GYMPLAN_LOADED = true;

function showFatalError(err) {
  console.error('[GymPlan Fatal]', err);
  const app = document.getElementById('app');
  if (app && app.innerHTML.includes('Загрузка')) {
    app.innerHTML = `<div style="padding:20px;color:#FF6B6B;font-family:monospace;font-size:12px;white-space:pre-wrap;">Ошибка запуска:\n${err?.message || err}\n\n${err?.stack || ''}</div>`;
  }
}

window.addEventListener('error', e => showFatalError(e.error));
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
    }, 150);
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
    alert('Ошибка импорта: неверный формат файла');
  }
  e.target.value = '';
});

// Аварийное сохранение
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
const DOUBLE_BACK_MS = 2000;

function setupBackHandler() {
  try {
    history.replaceState({ gymplan: true }, '');
    history.pushState({ gymplan: true }, '');
  } catch(e) { console.warn('History API недоступен:', e); }

  window.addEventListener('popstate', async () => {
    if (handleBack()) {
      try { history.pushState({ gymplan: true }, ''); } catch(_) {}
      return;
    }

    try { history.pushState({ gymplan: true }, ''); } catch(_) {}

    const now = Date.now();
    if (now - lastBackPress < DOUBLE_BACK_MS) {
      const closed = closeApp();
      if (!closed) uiAlert('Закройте приложение через меню устройства');
      return;
    }
    lastBackPress = now;

    const ok = await uiConfirm('Выйти из GymPlan?');
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
    swReloading = true;
    if (state.screen === 'workout' || state.rest) {
      console.log('[SW] Обновление готово. Применится после завершения тренировки.');
      return;
    }
    window.location.reload();
  });

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SW_UPDATED' && state.screen !== 'workout' && !state.rest) {
      if (swReloading) return;
      swReloading = true;
      window.location.reload();
    }
  });
}

(async function init() {
  try {
    initBridgeEvents();
    setupBackHandler();
    render();

    await Promise.race([
      loadState(),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);

    render();
    setupServiceWorkerUpdates();
  } catch (err) {
    showFatalError(err);
  }
})();

/**
 * Файл: js/main.js
 * Версия: 1.2.0
 * Описание: Точка входа. Инициализация, глобальные слушатели, обработка системной кнопки «Назад» Android через history API с подтверждением выхода и защитой от случайного закрытия.
 */

import { loadState, saveState, importData, state } from './state.js';
import { render, ACTIONS, renderLibraryList, initBridgeEvents, handleBack } from './ui.js';
import { uiConfirm, uiAlert, closeApp } from './bridge.js';

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

window.addEventListener('beforeunload', () => { saveState(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveState();
});

/**
 * Обработка системной кнопки «Назад» на Android.
 * - Внутри экранов: возврат на шаг назад (перехватываем событие).
 * - На главном экране: спрашиваем «Выйти?».
 * - Двойное нажатие за 2 сек: выход без вопросов (как в Telegram).
 */
let lastBackPress = 0;
const DOUBLE_BACK_MS = 2000;

function setupBackHandler() {
  history.replaceState({ gymplan: true }, '', '');
  history.pushState({ gymplan: true }, '', '');

  window.addEventListener('popstate', async () => {
    // 1) Внутри приложения — обрабатываем шаг назад и восстанавливаем буфер
    if (handleBack()) {
      history.pushState({ gymplan: true }, '', '');
      return;
    }

    // 2) Главный экран — сначала восстанавливаем буфер, чтобы не вылететь случайно
    history.pushState({ gymplan: true }, '', '');

    // 3) Двойное нажатие — выход без вопросов
    const now = Date.now();
    if (now - lastBackPress < DOUBLE_BACK_MS) {
      const closed = closeApp();
      if (!closed) {
        uiAlert('Закройте приложение через меню устройства');
      }
      return;
    }
    lastBackPress = now;

    // 4) Одиночное нажатие — спрашиваем подтверждение
    const ok = await uiConfirm('Выйти из GymPlan?');
    if (ok) {
      const closed = closeApp();
      if (!closed) {
        uiAlert('Закройте приложение через меню устройства');
      }
    }
    // Если «Нет» — остаёмся, буфер уже восстановлен
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
  await loadState();
  initBridgeEvents();
  setupBackHandler();
  render();
  setupServiceWorkerUpdates();
})();

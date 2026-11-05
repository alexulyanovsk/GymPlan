import { loadState, saveState, importData, state } from './state.js';
import { render, ACTIONS, renderLibraryList, initBridgeEvents } from './ui.js'; // <--- Добавлен initBridgeEvents
import { tg } from './bridge.js';

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

(async function init() {
  await loadState();
  initBridgeEvents(); // <--- Инициализация нативных кнопок MAX/TG
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('SW registration failed: ', err);
      });
    });
  }
})();

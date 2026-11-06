/**
 * Файл: js/ui.js
 * Версия: 3.7.0
 * Описание: Точная SVG-гантель. Исправлена верстка экрана тренировки.
 */

import { state, saveState, getCurrentEx, getLastAttempt, progressionHint, startValues, getInDays, exportData, importData, invalidatePlanCaches, invalidateHistoryCaches } from './state.js';
import { M, EX_ENTRIES, EXERCISES, LIMITS } from './data.js';
import { $, e, fn, pn, rs, ws, fd } from './utils.js';
import { tg, haptic, hapticNotify, uiConfirm, uiAlert, enableCloseConfirm, disableCloseConfirm } from './bridge.js';
import { generatePlan } from './generator.js';

let restTicker = null;
let lastMainBtnAt = 0;
let lastSyncKey = '';
let prevRenderKey = '';
let doneSetRunning = false;
let csvExportRunning = false;
let generatorOptions = { goal: 'hypertrophy', exp: 'intermediate', days: 4, equipment: ['barbell', 'dumbbell', 'machine'], excludedGroups: [] };

const ICON = {
  play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  book: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
  plus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
  download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  x: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  arrowRight: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
  arrowUp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
  arrowDown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`,
  trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  sparkles: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>`,
  
  // ИДЕАЛЬНАЯ КОПИЯ ИКОНКИ ИЗ ФОТО 1/2
  dumbbell: `<svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="28" width="30" height="44" rx="15" fill="var(--accent)"/>
    <rect x="3" y="42" width="44" height="16" rx="8" fill="var(--accent)"/>
    <circle cx="25" cy="50" r="7" fill="var(--bg)"/>
    <rect x="60" y="28" width="30" height="44" rx="15" fill="var(--accent)"/>
    <rect x="53" y="42" width="44" height="16" rx="8" fill="var(--accent)"/>
    <circle cx="75" cy="50" r="7" fill="var(--bg)"/>
    <rect x="25" y="42" width="50" height="16" rx="8" fill="var(--accent)"/>
  </svg>`
};

export function handleBack() {
  if (state.pendingAdd) { closeAddDialog(); return true; }
  if (state.newDayOpen) { closeNewDay(); return true; }
  if (state.generatorOpen) { closeGenerator(); return true; }
  if (state.screen === 'workout') { cancelWorkout(); return true; }
  if (state.screen === 'complete') { goMenu(); return true; }
  if (state.screen === 'dayEdit') { closeDayEdit(); return true; }
  if (state.screen === 'library') { exitLibrary(); return true; }
  if (state.screen === 'history') { goMenu(); return true; }
  return false;
}

export function initBridgeEvents() {
  if (!tg) return;
  if (tg.MainButton) {
    tg.MainButton.onClick(() => {
      if (state.rest) { skipRest(); return; }
      const w = state.workout, ex = getCurrentEx();
      if (!w || !ex) return;
      if (w.tempSets.length >= ex.sets) advanceExercise(); else doneSet();
    });
  }
  if (tg.BackButton) {
    tg.BackButton.onClick(() => { handleBack(); });
  }
}

export function render() {
  const app = $('app');
  const scrollTop = window.scrollY;
  
  app.className = `layout-${state.screen}`;

  if ($('csvModalBackdrop') && state.screen !== 'history') closeCsvModal();

  const activeEl = document.activeElement;
  const activeId = activeEl?.id;
  const selStart = activeEl?.selectionStart;
  const selEnd = activeEl?.selectionEnd;

  const renderKey = `${state.screen}|${state.workout?.exIdx ?? ''}`;
  let html = '';
  switch (state.screen) {
    case 'menu': html = renderMenu(); break;
    case 'workout': html = renderWorkout(); break;
    case 'complete': html = renderComplete(); break;
    case 'library': html = renderLibrary(); break;
    case 'history': html = renderHistory(); break;
    case 'dayEdit': html = renderDayEdit(); break;
    default: html = renderMenu();
  }
  
  app.innerHTML = html;

  document.getElementById('addDialogBackdrop')?.remove();
  document.getElementById('newDayDialogBackdrop')?.remove();
  document.getElementById('generatorDialogBackdrop')?.remove();

  if (state.pendingAdd) {
    const dHtml = renderAddDialog();
    if (dHtml) document.body.insertAdjacentHTML('beforeend', dHtml);
  }
  if (state.newDayOpen) {
    document.body.insertAdjacentHTML('beforeend', renderNewDayDialog());
  }
  if (state.generatorOpen) {
    document.body.insertAdjacentHTML('beforeend', renderGeneratorDialog());
  }

  document.body.classList.toggle('modal-open', !!state.pendingAdd || !!state.newDayOpen || !!state.generatorOpen || !!$('csvModalBackdrop'));

  if (renderKey === prevRenderKey && scrollTop > 0 && ['library', 'history', 'dayEdit'].includes(state.screen)) {
    requestAnimationFrame(() => window.scrollTo(0, scrollTop));
  }
  prevRenderKey = renderKey;

  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      if (selStart !== undefined && selEnd !== undefined && el.setSelectionRange) {
        try { el.setSelectionRange(selStart, selEnd); } catch(_) {}
      }
    }
  }

  if (state.screen === 'workout') {
    const wIn = $('wInput'), rIn = $('rInput'), nIn = $('noteInput');
    if (wIn) {
      wIn.addEventListener('input', ev => {
        const v = ev.target.value.trim();
        if (v === '') return;
        const n = pn(v);
        if (isFinite(n)) state.workout.currentWeight = n;
      });
      wIn.addEventListener('change', () => { if (state.workout) saveState(); });
    }
    if (rIn) {
      rIn.addEventListener('input', ev => {
        const v = ev.target.value.trim();
        if (v === '') return;
        const n = pn(v);
        if (isFinite(n)) state.workout.currentReps = n;
      });
      rIn.addEventListener('change', () => { if (state.workout) saveState(); });
    }
    if (nIn) {
      nIn.addEventListener('input', ev => { if (state.workout) state.workout.currentNote = ev.target.value; });
      nIn.addEventListener('change', () => { if (state.workout) saveState(); });
    }
  }
  syncTelegramUI(); updateRestUI();
}

function syncTelegramUI() {
  if (!tg) return;
  const w = state.workout, ex = getCurrentEx();
  const day = w ? state.plans[w.dayId] : null;
  const allDone = w && ex && w.tempSets.length >= ex.sets;
  const isLastEx = day && w && w.exIdx >= day.exercises.length - 1;
  const restActive = !!state.rest;
  const key = `${state.screen}|${allDone ? 1 : 0}|${w?.exIdx ?? ''}|${w?.tempSets?.length ?? ''}|${isLastEx ? 1 : 0}|${restActive ? 1 : 0}`;
  if (key === lastSyncKey) return; lastSyncKey = key;
  if (state.screen === 'workout') {
    if (tg.MainButton) {
      if (restActive) tg.MainButton.setText('⏭ ПРОПУСТИТЬ ОТДЫХ');
      else if (allDone) tg.MainButton.setText(isLastEx ? 'ЗАВЕРШИТЬ' : 'СЛЕДУЮЩЕЕ');
      else tg.MainButton.setText('СДЕЛАНО');
      tg.MainButton.show();
    }
    if (tg.BackButton) tg.BackButton.show();
  } else {
    if (tg.MainButton) tg.MainButton.hide();
    if (tg.BackButton) { if (state.screen === 'menu' || state.screen === 'complete') tg.BackButton.hide(); else tg.BackButton.show(); }
  }
}

function renderMenu() {
  const hasPlans = Object.keys(state.plans).length > 0;

  if (!hasPlans) {
    return `
      <div class="menu-header" style="text-align: center;">
        <h1 style="margin-bottom: 4px;">GymPlan</h1>
        <p class="dim small" style="font-weight:500; margin:0;">Умный трекер тренировок</p>
      </div>
      
      <div class="menu-scroll-area" style="justify-content:center; align-items:center; text-align:center;">
        <div style="margin-bottom:24px; opacity: 0.9;">
          ${ICON.dumbbell}
        </div>
        <h2 style="font-size: 26px; font-weight: 800; margin-bottom:12px; letter-spacing: -0.5px;">Добро пожаловать!</h2>
        <p class="dim" style="margin-bottom:32px; max-width:280px; font-weight:500; font-size: 15px;">
          У вас пока нет плана. Позвольте нашему алгоритму создать идеальную программу под ваши цели и оборудование.
        </p>
        
        <button class="btn btn-primary" data-action="openGenerator" style="width:100%; max-width:300px;">
          ${ICON.sparkles} Сгенерировать план
        </button>
        <button class="btn btn-secondary mt-10" data-action="openNewDay" style="width:100%; max-width:300px;">
          ${ICON.plus} Создать вручную
        </button>
      </div>
      
      <div class="menu-footer">
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-small" data-action="importData" style="flex:1; padding:12px;">${ICON.download} Импорт</button>
        </div>
      </div>
    `;
  }

  let daysHtml = '';
  Object.entries(state.plans).forEach(([id, d], idx) => {
    const c = d.exercises.length; const s = c === 1 ? 'упражнение' : c < 5 ? 'упражнения' : 'упражнений';
    
    const isCompleted = state.history.length > 0 && state.history[0].dayId === id && state.lastCompletedTs > 0;
    const isActive = state.workout && state.workout.dayId === id;

    const numClass = isCompleted && !isActive ? 'text-muted' : 'text-accent';
    const cardClass = isCompleted && !isActive ? 'completed' : '';
    const subText = isCompleted && !isActive ? `${c} ${s} · Выполнено` : `${c} ${s}`;

    daysHtml += `<button class="bento-card ${cardClass}" data-action="beginWorkout" data-id="${e(id)}">
      <div class="bento-day-num ${numClass}">0${idx + 1}</div>
      <div>
        <div class="bento-title">${e(d.title.split('·')[1]?.trim() || d.title)}</div>
        <div class="bento-sub">${subText}</div>
      </div>
    </button>`;
  });

  const hasProgress = state.workout && (state.workout.tempSets.length > 0 || state.workout.results.length > 0);
  const canResume = hasProgress && state.plans[state.workout.dayId];
  
  const resumeBtn = canResume ? `<button class="bento-card full-width quick-start" data-action="resumeWorkout">
      <div style="color:var(--accent);">${ICON.play}</div>
      <div>
        <div class="bento-title">Продолжить тренировку</div>
        <div class="bento-sub">${e(state.plans[state.workout.dayId].title)} · Упр. ${state.workout.exIdx + 1} из ${state.plans[state.workout.dayId].exercises.length}</div>
      </div>
    </button>` : '';

  const lastDay = state.currentDayId ? state.plans[state.currentDayId] : null;
  const qs = !canResume && lastDay && !(state.history.length > 0 && state.history[0].dayId === lastDay.id)
    ? `<button class="bento-card full-width quick-start" data-action="beginWorkout" data-id="${e(state.currentDayId)}">
        <div style="color:var(--accent);">${ICON.play}</div>
        <div>
          <div class="bento-title">Быстрый старт</div>
          <div class="bento-sub">${e(lastDay.title)}</div>
        </div>
      </button>` : '';

  return `
    <div class="menu-header">
      <h1>GymPlan</h1>
      <p class="dim small" style="font-weight:500; margin:0;">Ваша программа</p>
    </div>
    
    <div class="menu-scroll-area">
      ${resumeBtn}
      ${qs}
      <div class="bento-grid">${daysHtml}</div>
    </div>
    
    <div class="menu-footer">
      <div class="menu-grid-buttons">
        <button class="btn btn-secondary" data-action="openLibrary">${ICON.book} Библиотека</button>
        <button class="btn btn-secondary" data-action="openHistory">${ICON.chart} История</button>
      </div>
      <div style="display:flex; gap:8px; margin-top:4px;">
        <button class="btn btn-primary" data-action="openGenerator" style="flex:1; padding:12px; background:rgba(204,255,0,0.1); color:var(--accent); border:1px solid var(--accent);">${ICON.sparkles} Генератор</button>
        <button class="btn btn-secondary" data-action="openNewDay" style="flex:1; padding:12px;">${ICON.plus} Свой день</button>
      </div>
      <div style="display:flex; gap:8px; margin-top:4px;">
        <button class="btn btn-secondary btn-small" data-action="exportData" style="flex:1; padding:10px;">${ICON.upload} Экспорт</button>
        <button class="btn btn-secondary btn-small" data-action="importData" style="flex:1; padding:10px;">${ICON.download} Импорт</button>
      </div>
    </div>
  `;
}

function renderWorkout() {
  const w = state.workout; if (!w) return '<div class="empty">Ошибка: тренировка не начата</div>';
  const day = state.plans[w.dayId];
  if (!day) return `<div class="top-bar"><h1>Ошибка</h1><button class="close-btn" data-action="goMenu">${ICON.x}</button></div><div class="empty">День не найден.<br><button class="btn btn-primary btn-small btn-centered mt-16" data-action="goMenu">В меню</button></div>`;
  const exId = day.exercises[w.exIdx];
  if (!exId) return `<div class="top-bar"><h1>Ошибка</h1><button class="close-btn" data-action="goMenu">${ICON.x}</button></div><div class="empty">Упражнение не найдено.</div>`;
  const ex = EXERCISES[exId]; if (!ex) return `<div class="empty">Данные упражнения не найдены.</div>`;
  const isBW = ex.unit === 'свой вес';
  const wVal = Number.isFinite(w.currentWeight) ? w.currentWeight : 0;
  const rVal = Number.isFinite(w.currentReps) ? w.currentReps : 1;
  const allDone = w.tempSets.length >= ex.sets, extra = Math.max(0, w.tempSets.length - ex.sets);
  const last = getLastAttempt(exId), prog = progressionHint(exId);
  const lastBlock = last && last.length > 0 ? `<div class="last-block">Прошлый раз: ${e(last.map(s => isBW ? `${s.reps}с` : `${fn(s.weight)}×${s.reps}`).join(', '))}</div>` : '';
  const hintBlock = prog ? `<div class="hint-block">${prog}</div>` : '';
  const gifHtml = ex.gif ? `<div class="gif-block"><img src="${e(ex.gif)}" alt="${e(ex.name)}" referrerpolicy="no-referrer"><div class="gif-placeholder">🏋️</div></div>` : `<div class="gif-block no-gif"><div class="gif-placeholder">🏋️</div></div>`;
  
  const weightCtrls = isBW ? '' : `
    <div class="controls-row">
      <button class="circle-btn" data-action="decW">−</button>
      <div class="value-display">
        <input type="number" class="value-input" id="wInput" value="${wVal}" step="${ex.inc}" inputmode="decimal" autocomplete="off" aria-label="Вес">
        <div class="value-label">${e(ex.unit)}</div>
      </div>
      <button class="circle-btn" data-action="incW">+</button>
    </div>`;

  const primaryAction = allDone ? 'advanceExercise' : 'doneSet';
  const primaryLabel = allDone ? `Следующее упражнение${extra > 0 ? ` (${w.tempSets.length})` : ''}` : 'Подход выполнен';
  const extraBtn = allDone ? `<button class="btn btn-secondary btn-small" data-action="doneSet">+ Ещё подход</button>` : '';

  return `
    <div class="workout-header">
      <div class="top-bar" style="margin-bottom:0;">
        <div>
          <div class="progress-label">Упражнение ${w.exIdx + 1} из ${day.exercises.length}</div>
          <div class="ex-title">${e(ex.name)}</div>
          <div class="ex-meta">${ex.sets} × ${rs(ex)} · старт: ${e(ws(ex))}</div>
        </div>
        <button class="close-btn" data-action="cancelWorkout" aria-label="Выйти">${ICON.x}</button>
      </div>
    </div>
    
    <div class="workout-body">
      ${gifHtml}
      <div class="note-block">${e(ex.note)}</div>
      ${hintBlock}
      ${lastBlock}
    </div>
    
    <div class="workout-footer">
      <div class="set-counter">Подход ${w.tempSets.length + 1}${allDone ? ` (сверх плана: ${extra + 1})` : ` из ${ex.sets}`}</div>
      ${weightCtrls}
      
      <div class="controls-row">
        <button class="circle-btn" data-action="decR">−</button>
        <div class="value-display">
          <input type="number" class="value-input" id="rInput" value="${rVal}" step="${isBW ? 5 : 1}" inputmode="numeric" autocomplete="off" aria-label="Повторы">
          <div class="value-label">${isBW ? 'сек' : 'повт.'}</div>
        </div>
        <button class="circle-btn" data-action="incR">+</button>
      </div>
      
      <input type="text" class="note-input" id="noteInput" maxlength="500" placeholder="Заметка к упражнению..." value="${e(w.currentNote || '')}">
      
      <button class="btn btn-primary" data-action="${primaryAction}">${primaryLabel}</button>
      ${extraBtn}
      <button class="btn btn-secondary btn-small mt-10" data-action="skipExercise">Пропустить упражнение</button>
    </div>
  `;
}

function renderComplete() {
  const h = state.history[0];
  const isThisSession = h && h.ts === state.lastCompletedTs;
  if (!h || !isThisSession) { state.screen = 'menu'; return renderMenu(); }
  let summary = '';
  (h.exercises || []).forEach(r => {
    if (!r || !Array.isArray(r.sets)) return;
    const ex = EXERCISES[r.id]; if (!ex) return;
    const isBW = ex.unit === 'свой вес';
    const setsTxt = r.sets.map(s => isBW ? `${s.reps}с` : `${fn(s.weight)}×${s.reps}`).join(', ');
    summary += `<div class="mt-10" style="margin-bottom:12px;"><span class="dim" style="font-weight:600;">${e(ex.name)}:</span> <span style="font-weight:700;">${e(setsTxt)}</span>${r.note ? `<div class="history-note">${e(r.note)}</div>` : ''}</div>`;
  });
  const nid = findNextDayId(h.dayId);
  return `
    <div style="text-align:center; margin-top:40px; margin-bottom:24px;">
      <div style="display:inline-flex; align-items:center; justify-content:center; width:80px; height:80px; background:rgba(204,255,0,0.1); border-radius:50%; color:var(--accent); margin-bottom:16px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <h1 style="margin:0;">Готово!</h1>
      <p class="dim" style="margin-top:8px; font-weight:500;">Тренировка сохранена</p>
    </div>
    <div class="card" style="background:var(--surface); padding:20px; border-radius:var(--radius-md); border:var(--border); margin-bottom:24px;">
      ${summary || '<div class="dim">Нет данных</div>'}
    </div>
    ${nid ? `<button class="btn btn-primary" data-action="nextDay" data-id="${e(nid)}">Следующий день ${ICON.arrowRight}</button>` : ''}
    <button class="btn btn-secondary mt-10" data-action="goMenu">В меню</button>
  `;
}

function buildLibraryItem(id, ex) {
  const inDays = getInDays(id);
  return `<div class="lib-item" data-action="pickExercise" data-id="${e(id)}">
    <div class="lib-item-title">${e(ex.name)}</div>
    <div class="lib-item-meta">${e(ex.muscle)} · ${ex.sets} × ${rs(ex)}</div>
    ${inDays.length > 0 ? `<div class="lib-item-in">${ICON.check} В: ${inDays.map(e).join(', ')}</div>` : ''}
  </div>`;
}

export function renderLibraryList() {
  const q = state.libSearch.toLowerCase().trim();
  const filtered = EX_ENTRIES.filter(([_, ex]) => {
    const matchM = state.libFilter === 'Все' || ex.muscle === state.libFilter;
    const matchQ = !q || ex.name.toLowerCase().includes(q);
    return matchM && matchQ;
  });
  if (state.libFilter === 'Все' && !q) {
    let html = '';
    M.forEach(m => {
      if (m === 'Все') return;
      const exs = filtered.filter(([_, ex]) => ex.muscle === m);
      if (exs.length > 0) { html += `<div class="lib-group-title">${m}</div>`; exs.forEach(([id, ex]) => { html += buildLibraryItem(id, ex); }); }
    });
    return html || '<div class="empty">Ничего не найдено</div>';
  }
  return filtered.map(([id, ex]) => buildLibraryItem(id, ex)).join('') || '<div class="empty">Ничего не найдено</div>';
}

function renderLibrary() {
  const chips = M.map(m => `<button class="chip ${m === state.libFilter ? 'active' : ''}" data-action="setFilter" data-id="${e(m)}">${e(m)}</button>`).join('');
  const pickBanner = state.pickForDayId && state.plans[state.pickForDayId]
    ? `<div class="pick-banner">Выберите для «${e(state.plans[state.pickForDayId].title)}»</div>` : '';
  return `
    <div class="top-bar">
      <h1>Библиотека</h1>
      <button class="close-btn" data-action="exitLibrary">${ICON.x}</button>
    </div>
    ${pickBanner}
    <input type="text" class="search-input" id="searchInput" placeholder="Поиск упражнения..." value="${e(state.libSearch)}">
    <div class="chips">${chips}</div>
    <div id="libList">${renderLibraryList()}</div>
  `;
}

function renderHistory() {
  if (state.history.length === 0) return `<div class="top-bar"><h1>История</h1><button class="close-btn" data-action="goMenu">${ICON.x}</button></div><div class="empty">История пуста.</div>`;
  let items = '';
  state.history.forEach(h => {
    let exLines = '';
    (h.exercises || []).forEach(r => {
      if (!r || !Array.isArray(r.sets)) return;
      const ex = EXERCISES[r.id]; if (!ex) return;
      const setsTxt = r.sets.map(s => ex.unit === 'свой вес' ? `${s.reps}с` : `${fn(s.weight)}×${s.reps}`).join(', ');
      exLines += `<div class="history-ex"><span class="history-ex-name">${e(ex.name)}:</span> ${e(setsTxt)}${r.note ? `<div class="history-note">${e(r.note)}</div>` : ''}</div>`;
    });
    items += `<div class="history-item"><div class="history-date">${e(fd(h.ts))} · ${e(h.dayTitle || '')}</div>${exLines}</div>`;
  });
  return `
    <div class="top-bar">
      <h1>История</h1>
      <button class="close-btn" data-action="goMenu">${ICON.x}</button>
    </div>
    <button class="btn btn-secondary btn-small" data-action="exportCsv" style="margin-bottom:24px;">${ICON.download} Экспорт в CSV</button>
    ${items}
  `;
}

function renderDayEdit() {
  const id = state.editingDayId;
  const d = id ? state.plans[id] : null;
  if (!d) return `<div class="top-bar"><h1>День</h1><button class="close-btn" data-action="closeDayEdit">${ICON.x}</button></div><div class="empty">День не найден.</div>`;
  const isCustom = id.startsWith('custom_') || id.startsWith('gen_');
  let rows = '';
  d.exercises.forEach((exId, i) => {
    const ex = EXERCISES[exId]; if (!ex) return;
    rows += `<div class="ex-edit-row">
      <div class="ex-edit-name">${e(ex.name)}</div>
      <button class="ex-edit-btn" data-action="moveEx" data-day="${e(id)}" data-idx="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>${ICON.arrowUp}</button>
      <button class="ex-edit-btn" data-action="moveEx" data-day="${e(id)}" data-idx="${i}" data-dir="1" ${i === d.exercises.length - 1 ? 'disabled' : ''}>${ICON.arrowDown}</button>
      <button class="ex-edit-btn remove" data-action="removeExFromDayEdit" data-day="${e(id)}" data-idx="${i}">${ICON.trash}</button>
    </div>`;
  });
  const deleteBtn = isCustom ? `<button class="btn btn-danger btn-small mt-16" data-action="deleteDay" data-id="${e(id)}">Удалить день</button>` : '';
  return `
    <div class="top-bar">
      <div>
        <div class="progress-label">Редактирование</div>
        <h1 style="margin:0;">${e(d.title)}</h1>
      </div>
      <button class="close-btn" data-action="closeDayEdit">${ICON.x}</button>
    </div>
    <div style="margin-bottom:24px">${rows || '<div class="empty">Нет упражнений.</div>'}</div>
    <button class="btn btn-primary btn-small" data-action="addExFromDayEdit">${ICON.plus} Добавить упражнение</button>
    ${deleteBtn}
  `;
}

function renderAddDialog() {
  const p = state.pendingAdd; if (!p?.exId) return '';
  const ex = EXERCISES[p.exId]; if (!ex) return '';
  const gifHtml = ex.gif ? `<div class="gif-block" style="height: 150px; margin-bottom: 16px;"><img src="${e(ex.gif)}" alt="${e(ex.name)}" referrerpolicy="no-referrer"></div>` : '';
  const btns = Object.entries(state.plans).map(([dId, d]) => {
    const has = d.exercises.includes(p.exId);
    return `<button class="modal-day-btn" data-action="${has ? 'removeExFromDay' : 'addExToDay'}" data-day="${e(dId)}" data-ex="${e(p.exId)}"><span>${e(d.title)}</span>${has ? '<span class="remove-action">Удалить</span>' : '<span class="add-action">Добавить</span>'}</button>`;
  }).join('');
  return `<div class="modal-backdrop" id="addDialogBackdrop"><div class="modal">${gifHtml}<h3>${e(ex.name)}</h3>${btns}<button class="btn btn-secondary btn-small mt-10" data-action="closeAddDialog">Закрыть</button></div></div>`;
}

function renderNewDayDialog() {
  return `<div class="modal-backdrop" id="newDayDialogBackdrop"><div class="modal"><h3>Новый день</h3><input type="text" class="modal-input" id="newDayNameInput" maxlength="50" placeholder="Название дня..." value="${e(state.newDayName || '')}"><button class="btn btn-primary" data-action="createNewDay">Создать</button><button class="btn btn-secondary btn-small mt-10" data-action="closeNewDay">Отмена</button></div></div>`;
}

function renderGeneratorDialog() {
  const groups = ['Грудь', 'Спина', 'Плечи', 'Руки', 'Ноги'];
  const groupChips = groups.map(g => {
    const isExcluded = generatorOptions.excludedGroups.includes(g);
    return `<button class="chip ${!isExcluded ? 'active' : ''}" data-action="genToggleExclude" data-val="${g}">${g}</button>`;
  }).join('');

  return `<div class="modal-backdrop" id="generatorDialogBackdrop">
    <div class="modal">
      <h3 style="margin-bottom:16px;">Умный генератор</h3>
      
      <div style="margin-bottom:12px;">
        <div class="progress-label" style="color:var(--text-muted); margin-bottom:8px;">Цель</div>
        <div class="chips">
          <button class="chip ${generatorOptions.goal === 'hypertrophy' ? 'active' : ''}" data-action="genSetGoal" data-val="hypertrophy">Масса</button>
          <button class="chip ${generatorOptions.goal === 'strength' ? 'active' : ''}" data-action="genSetGoal" data-val="strength">Сила</button>
          <button class="chip ${generatorOptions.goal === 'endurance' ? 'active' : ''}" data-action="genSetGoal" data-val="endurance">Выносливость</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <div class="progress-label" style="color:var(--text-muted); margin-bottom:8px;">Опыт</div>
        <div class="chips">
          <button class="chip ${generatorOptions.exp === 'beginner' ? 'active' : ''}" data-action="genSetExp" data-val="beginner">Новичок</button>
          <button class="chip ${generatorOptions.exp === 'intermediate' ? 'active' : ''}" data-action="genSetExp" data-val="intermediate">Средний</button>
          <button class="chip ${generatorOptions.exp === 'advanced' ? 'active' : ''}" data-action="genSetExp" data-val="advanced">Профи</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <div class="progress-label" style="color:var(--text-muted); margin-bottom:8px;">Дней в неделю</div>
        <div class="chips">
          <button class="chip ${generatorOptions.days === 2 ? 'active' : ''}" data-action="genSetDays" data-val="2">2</button>
          <button class="chip ${generatorOptions.days === 3 ? 'active' : ''}" data-action="genSetDays" data-val="3">3</button>
          <button class="chip ${generatorOptions.days === 4 ? 'active' : ''}" data-action="genSetDays" data-val="4">4</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <div class="progress-label" style="color:var(--text-muted); margin-bottom:8px;">Оборудование</div>
        <div class="chips" style="flex-wrap:wrap;">
          <button class="chip ${generatorOptions.equipment.includes('all') ? 'active' : ''}" data-action="genToggleEq" data-val="all">Всё</button>
          <button class="chip ${generatorOptions.equipment.includes('barbell') ? 'active' : ''}" data-action="genToggleEq" data-val="barbell">Штанга</button>
          <button class="chip ${generatorOptions.equipment.includes('dumbbell') ? 'active' : ''}" data-action="genToggleEq" data-val="dumbbell">Гантели</button>
          <button class="chip ${generatorOptions.equipment.includes('machine') ? 'active' : ''}" data-action="genToggleEq" data-val="machine">Тренажеры</button>
          <button class="chip ${generatorOptions.equipment.includes('cable') ? 'active' : ''}" data-action="genToggleEq" data-val="cable">Блоки</button>
          <button class="chip ${generatorOptions.equipment.includes('bodyweight') ? 'active' : ''}" data-action="genToggleEq" data-val="bodyweight">Свой вес</button>
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <div class="progress-label" style="color:var(--text-muted); margin-bottom:8px;">Группы мышц</div>
        <div class="chips" style="flex-wrap:wrap;">
          ${groupChips}
        </div>
      </div>

      <button class="btn btn-primary" data-action="generatePlanAction">Создать программу</button>
      <button class="btn btn-secondary btn-small mt-10" data-action="closeGenerator">Отмена</button>
    </div>
  </div>`;
}

let csvModalData = null;
function showCsvModal(csv) {
  closeCsvModal();
  csvModalData = csv;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="csvModalBackdrop">
      <div class="modal">
        <h3>Экспорт CSV</h3>
        <textarea class="modal-input" readonly id="csvText" style="min-height:200px;font-family:monospace;font-size:12px;resize:vertical;">${e(csv)}</textarea>
        <button class="btn btn-primary" data-action="copyCsv">Скопировать</button>
        <button class="btn btn-secondary btn-small mt-10" data-action="closeCsvModal">Закрыть</button>
      </div>
    </div>
  `);
  document.body.classList.add('modal-open');
  const ta = document.getElementById('csvText');
  if (ta) ta.addEventListener('click', () => ta.select());
}
function closeCsvModal() {
  const el = document.getElementById('csvModalBackdrop');
  if (el) el.remove();
  csvModalData = null;
  if (!state.pendingAdd && !state.newDayOpen && !state.generatorOpen) document.body.classList.remove('modal-open');
}

function startRestTicker() { if (restTicker) return; restTicker = setInterval(updateRestUI, LIMITS.restTickMs); }
function stopRestTicker() { if (restTicker) { clearInterval(restTicker); restTicker = null; } }
function startRest(s) {
  state.rest = { endsAt: Date.now() + s * 1000 };
  saveState();
  startRestTicker(); updateRestUI();
  lastSyncKey = ''; syncTelegramUI();
}
function adjustRest(s) {
  if (!state.rest) return;
  state.rest.endsAt += s * 1000;
  if (state.rest.endsAt < Date.now()) state.rest.endsAt = Date.now();
  saveState();
  updateRestUI();
}
function skipRest() {
  state.rest = null;
  updateRestUI();
  stopRestTicker();
  saveState();
  lastSyncKey = ''; syncTelegramUI();
}
function updateRestUI() {
  const overlay = $('restOverlay');
  if (state.screen !== 'workout' || !state.rest) {
    if (overlay) overlay.remove();
    stopRestTicker();
    return;
  }
  const rem = Math.max(0, Math.ceil((state.rest.endsAt - Date.now()) / 1000));
  if (rem <= 0) {
    state.rest = null;
    if (overlay) overlay.remove();
    stopRestTicker();
    saveState();
    lastSyncKey = ''; syncTelegramUI();
    return;
  }
  const c = `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`;
  if (!overlay) {
    document.body.insertAdjacentHTML('beforeend', `<div class="rest-overlay" id="restOverlay"><div class="rest-label-top">Отдых</div><div class="rest-countdown" id="restCount">${c}</div><div class="rest-label-bottom">Восстановление</div><div class="rest-buttons"><button class="rest-btn" data-action="restMinus">−15</button><button class="rest-btn" data-action="restPlus">+15</button></div><button class="rest-skip" data-action="restSkip">Пропустить отдых</button></div>`);
    startRestTicker();
  } else { const el = $('restCount'); if (el) el.textContent = c; }
}

function beginWorkout(id) {
  const day = state.plans[id];
  if (!day?.exercises?.length) { uiAlert('В этом дне нет упражнений'); return; }
  const sv = startValues(day.exercises[0]);
  state.workout = { dayId: id, exIdx: 0, tempSets: [], currentWeight: sv.weight, currentReps: sv.reps, currentNote: '', results: [] };
  state.currentDayId = id; state.screen = 'workout'; state.rest = null;
  enableCloseConfirm();
  lastSyncKey = ''; prevRenderKey = '';
  saveState(); render();
}

async function doneSet() {
  if (doneSetRunning) return;
  if (Date.now() - lastMainBtnAt < LIMITS.cooldownMainBtnMs) return;
  lastMainBtnAt = Date.now();
  doneSetRunning = true;
  try {
    const w = state.workout; if (!w) return;
    const day = state.plans[w.dayId]; if (!day) return;
    const exId = day.exercises[w.exIdx], ex = EXERCISES[exId]; if (!ex) return;
    const wI = $('wInput'), rI = $('rInput'), nI = $('noteInput');
    const isBW = ex.unit === 'свой вес';
    const rawW = wI ? wI.value : String(w.currentWeight);
    const weight = isBW ? 0 : pn(rawW);
    const reps = rI ? pn(rI.value) : w.currentReps;
    if (!isBW && (!isFinite(weight) || weight < 0)) { uiAlert('Введите корректный вес'); return; }
    if (!isFinite(reps) || reps < 1) { uiAlert('Введите корректное число повторов'); return; }

    if (nI) w.currentNote = nI.value;
    w.currentWeight = weight; w.currentReps = reps;
    w.tempSets.push({ weight, reps });
    if (isBW) delete state.weights[exId];
    else { delete state.weights[exId]; state.weights[exId] = { weight, reps }; }
    haptic('medium');
    saveState();
    startRest(LIMITS.restSec);
    render();
  } finally { doneSetRunning = false; }
}

function advanceExercise() {
  if (doneSetRunning) return;
  if (Date.now() - lastMainBtnAt < LIMITS.cooldownMainBtnMs) return;
  lastMainBtnAt = Date.now();
  const w = state.workout; if (!w) return;
  const day = state.plans[w.dayId]; if (!day) return;
  const exId = day.exercises[w.exIdx], ex = EXERCISES[exId];
  if (ex && w.tempSets.length > 0) w.results.push({ id: exId, name: ex.name, sets: w.tempSets.slice(), note: w.currentNote || '' });
  w.tempSets = []; w.currentNote = ''; w.exIdx++;
  if (w.exIdx >= day.exercises.length) { finishWorkout(); return; }
  const sv = startValues(day.exercises[w.exIdx]);
  w.currentWeight = sv.weight; w.currentReps = sv.reps; state.rest = null;
  haptic('light'); saveState(); render();
}

function skipExercise() {
  if (doneSetRunning) return;
  if (Date.now() - lastMainBtnAt < LIMITS.cooldownMainBtnMs) return;
  lastMainBtnAt = Date.now();
  const w = state.workout; if (!w) return;
  const day = state.plans[w.dayId]; if (!day) return;
  const exId = day.exercises[w.exIdx], ex = EXERCISES[exId];
  if (ex && w.tempSets.length > 0) {
    w.results.push({ id: exId, name: ex.name, sets: w.tempSets.slice(), note: w.currentNote || '' });
  }
  w.tempSets = []; w.currentNote = ''; w.exIdx++;
  if (w.exIdx >= day.exercises.length) { finishWorkout(); return; }
  const sv = startValues(day.exercises[w.exIdx]);
  w.currentWeight = sv.weight; w.currentReps = sv.reps; state.rest = null;
  saveState(); render();
}

function finishWorkout() {
  const w = state.workout; if (!w) return;
  if (w.results.length === 0) {
    state.workout = null; state.currentDayId = null; state.screen = 'menu'; state.rest = null;
    disableCloseConfirm();
    saveState(); render();
    return;
  }
  const ts = Date.now();
  state.history.unshift({ ts, dayId: w.dayId, dayTitle: state.plans[w.dayId]?.title || '', exercises: w.results.slice() });
  state.lastCompletedTs = ts;
  state.workout = null; state.currentDayId = null; state.screen = 'complete'; state.rest = null;
  disableCloseConfirm();
  invalidateHistoryCaches();
  hapticNotify('success'); saveState(); render();
}

async function cancelWorkout() {
  const w = state.workout;
  if (w && w.tempSets.length === 0 && w.results.length === 0) {
    state.workout = null; state.currentDayId = null; state.screen = 'menu'; state.rest = null;
    disableCloseConfirm();
    lastSyncKey = ''; prevRenderKey = '';
    saveState(); render();
    return;
  }
  const ok = await uiConfirm('Прервать тренировку? Данные сессии будут потеряны.');
  if (!ok) return;
  state.workout = null; state.currentDayId = null; state.screen = 'menu'; state.rest = null;
  disableCloseConfirm();
  lastSyncKey = ''; prevRenderKey = '';
  saveState(); render();
}

export function goMenu() {
  state.screen = 'menu';
  state.pendingAdd = null; state.newDayOpen = false; state.generatorOpen = false; state.rest = null;
  state.editingDayId = null; state.pickForDayId = null;
  disableCloseConfirm();
  lastSyncKey = ''; prevRenderKey = '';
  saveState(); render();
}

function openLibrary() { state.screen = 'library'; state.pickForDayId = null; saveState(); render(); }
function openHistory() { state.screen = 'history'; saveState(); render(); }
function openNewDay() {
  state.newDayOpen = true; state.newDayName = ''; saveState(); render();
  setTimeout(() => { $('newDayNameInput')?.focus(); }, 100);
}
function closeNewDay() {
  state.newDayOpen = false; state.newDayName = ''; render();
}

function openGenerator() {
  state.generatorOpen = true;
  saveState(); render();
}

function closeGenerator() {
  state.generatorOpen = false;
  saveState(); render();
}

function toggleEq(el) {
  const val = el.dataset.val;
  if (val === 'all') {
    generatorOptions.equipment = ['all'];
    document.querySelectorAll('[data-action="genToggleEq"]').forEach(b => {
      b.classList.toggle('active', b.dataset.val === 'all');
    });
  } else {
    generatorOptions.equipment = generatorOptions.equipment.filter(e => e !== 'all');
    if (generatorOptions.equipment.includes(val)) {
      generatorOptions.equipment = generatorOptions.equipment.filter(e => e !== val);
      el.classList.remove('active');
    } else {
      generatorOptions.equipment.push(val);
      el.classList.add('active');
    }
    if (generatorOptions.equipment.length === 0) {
      generatorOptions.equipment = ['all'];
      document.querySelector('[data-action="genToggleEq"][data-val="all"]').classList.add('active');
    } else {
      document.querySelector('[data-action="genToggleEq"][data-val="all"]').classList.remove('active');
    }
  }
}

function toggleExcludeGroup(el) {
  const val = el.dataset.val;
  if (generatorOptions.excludedGroups.includes(val)) {
    generatorOptions.excludedGroups = generatorOptions.excludedGroups.filter(g => g !== val);
    el.classList.add('active');
  } else {
    generatorOptions.excludedGroups.push(val);
    el.classList.remove('active');
  }
}

function applyGeneratedPlan() {
  const newPlans = generatePlan({
    goal: generatorOptions.goal,
    exp: generatorOptions.exp,
    daysPerWeek: generatorOptions.days,
    equipment: generatorOptions.equipment,
    excludedGroups: generatorOptions.excludedGroups
  });

  if (!newPlans) {
    uiAlert('Недостаточно групп или оборудования. Выберите больше вариантов.');
    return;
  }

  Object.assign(state.plans, newPlans);
  state.generatorOpen = false;
  invalidatePlanCaches();
  saveState(); render();
  hapticNotify('success');
  uiAlert('Ваш план готов! Приятных тренировок.');
}

function exitLibrary() {
  if (state.pickForDayId) { state.pickForDayId = null; state.screen = 'dayEdit'; }
  else { state.screen = 'menu'; }
  prevRenderKey = ''; saveState(); render();
}

function editDay(id) { if (!state.plans[id]) return; state.editingDayId = id; state.screen = 'dayEdit'; saveState(); render(); }
function closeDayEdit() { state.editingDayId = null; state.pickForDayId = null; state.screen = 'menu'; prevRenderKey = ''; saveState(); render(); }
function addExFromDayEdit() { if (!state.editingDayId) return; state.pickForDayId = state.editingDayId; state.screen = 'library'; state.libSearch = ''; saveState(); render(); }
function moveExercise(dayId, idx, dir) {
  const d = state.plans[dayId]; if (!d) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= d.exercises.length) return;
  [d.exercises[idx], d.exercises[newIdx]] = [d.exercises[newIdx], d.exercises[idx]];
  invalidatePlanCaches(); saveState(); render();
}
function removeExFromDayEdit(dayId, idx) {
  const d = state.plans[dayId]; if (!d) return;
  d.exercises.splice(idx, 1);
  invalidatePlanCaches(); saveState(); render();
}
async function deleteDay(id) {
  const d = state.plans[id]; if (!d) return;
  const isActive = state.workout?.dayId === id;
  const msg = isActive
    ? `Удалить день "${d.title}"? Активная тренировка будет прервана.`
    : `Удалить день "${d.title}"?`;
  const ok = await uiConfirm(msg);
  if (!ok) return;
  delete state.plans[id];
  if (state.currentDayId === id) state.currentDayId = null;
  if (state.editingDayId === id) state.editingDayId = null;
  if (state.workout && state.workout.dayId === id) { state.workout = null; state.rest = null; }
  invalidatePlanCaches();
  state.screen = 'menu'; prevRenderKey = '';
  saveState(); render();
}

function createNewDay() {
  const i = $('newDayNameInput'), n = (i?.value || state.newDayName || '').trim().slice(0, 50);
  if (!n) { uiAlert('Введите название'); return; }
  const id = 'custom_' + Date.now();
  state.plans[id] = { title: n, exercises: [] };
  state.newDayOpen = false; state.newDayName = '';
  state.editingDayId = id; state.screen = 'dayEdit';
  invalidatePlanCaches(); prevRenderKey = '';
  saveState(); render();
}

function pickExercise(exId) {
  if (!EXERCISES[exId]) return;
  if (state.pendingAdd) return;
  if (state.pickForDayId) {
    const day = state.plans[state.pickForDayId];
    if (day && !day.exercises.includes(exId)) day.exercises.push(exId);
    state.pickForDayId = null; state.screen = 'dayEdit';
    invalidatePlanCaches(); prevRenderKey = '';
    saveState(); render();
    return;
  }
  state.pendingAdd = { exId }; render();
}
function addExToDay(dId, exId) {
  const d = state.plans[dId];
  if (d && EXERCISES[exId] && !d.exercises.includes(exId)) d.exercises.push(exId);
  state.pendingAdd = null; invalidatePlanCaches(); saveState(); render();
}
function removeExFromDay(dId, exId) {
  const d = state.plans[dId];
  if (d) d.exercises = d.exercises.filter(x => x !== exId);
  state.pendingAdd = null; invalidatePlanCaches(); saveState(); render();
}
function closeAddDialog() { state.pendingAdd = null; render(); }

function adjustWeight(d) {
  const w = state.workout; if (!w) return;
  w.currentWeight = Math.max(0, Math.round((w.currentWeight + d) * 10) / 10);
  const i = $('wInput'); if (i) i.value = w.currentWeight;
  saveState();
}
function adjustReps(d) {
  const w = state.workout; if (!w) return;
  w.currentReps = Math.max(1, w.currentReps + d);
  const i = $('rInput'); if (i) i.value = w.currentReps;
  saveState();
}

function findNextDayId(cId) {
  const ids = Object.keys(state.plans); if (!ids.length) return null;
  const idx = ids.indexOf(cId);
  return idx < 0 ? ids[0] : ids[(idx + 1) % ids.length];
}
function goNextDay(id) { state.workout = null; state.currentDayId = null; state.screen = 'menu'; lastSyncKey = ''; prevRenderKey = ''; saveState(); beginWorkout(id); }

async function exportCsv() {
  if (csvExportRunning) return;
  if (!state.history.length) { uiAlert('История пуста'); return; }
  csvExportRunning = true;
  try {
    let csv = 'Дата;День;Упражнение;Подход;Вес;Повторы;Заметка\n';
    state.history.forEach(h => (h.exercises || []).forEach(r => {
      if (!r || !Array.isArray(r.sets)) return;
      const ex = EXERCISES[r.id], n = (ex?.name || r.id || '').replace(/"/g, '""'), note = (r.note || '').replace(/"/g, '""');
      r.sets.forEach((s, i) => { csv += `"${fd(h.ts)}";"${(h.dayTitle || '').replace(/"/g, '""')}";"${n}";${i + 1};${s.weight};${s.reps};"${note}"\n`; });
    }));
    const filename = 'gymplan_' + Date.now() + '.csv';

    if (typeof File !== 'undefined' && navigator.canShare && navigator.share) {
      try {
        const file = new File(['\ufeff' + csv], filename, { type: 'text/csv;charset=utf-8' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'GymPlan export' });
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') { showCsvModal(csv); return; }
      }
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      try {
        const b = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = u; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(u), 1000);
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(csv);
      uiAlert('CSV скопирован в буфер обмена');
      return;
    } catch (_) {}
    showCsvModal(csv);
  } finally { csvExportRunning = false; }
}

export const ACTIONS = {
  beginWorkout: el => beginWorkout(el.dataset.id),
  resumeWorkout: () => { if (state.workout) { state.screen = 'workout'; prevRenderKey = ''; saveState(); render(); } },
  doneSet: () => doneSet(), advanceExercise: () => advanceExercise(), skipExercise: () => skipExercise(),
  cancelWorkout: () => cancelWorkout(), goMenu: () => goMenu(),
  openLibrary: () => openLibrary(), exitLibrary: () => exitLibrary(), openHistory: () => openHistory(),
  openNewDay: () => openNewDay(), closeNewDay: () => closeNewDay(), createNewDay: () => createNewDay(),
  openGenerator: () => openGenerator(), closeGenerator: () => closeGenerator(),
  generatePlanAction: () => applyGeneratedPlan(),
  genSetGoal: el => { generatorOptions.goal = el.dataset.val; document.querySelectorAll('[data-action="genSetGoal"]').forEach(b => b.classList.toggle('active', b.dataset.val === el.dataset.val)); },
  genSetExp: el => { generatorOptions.exp = el.dataset.val; document.querySelectorAll('[data-action="genSetExp"]').forEach(b => b.classList.toggle('active', b.dataset.val === el.dataset.val)); },
  genSetDays: el => { generatorOptions.days = Number(el.dataset.val); document.querySelectorAll('[data-action="genSetDays"]').forEach(b => b.classList.toggle('active', b.dataset.val === el.dataset.val)); },
  genToggleEq: el => toggleEq(el),
  genToggleExclude: el => toggleExcludeGroup(el),
  exportCsv: () => exportCsv(),
  copyCsv: async () => {
    if (!csvModalData) return;
    try { await navigator.clipboard.writeText(csvModalData); uiAlert('Скопировано'); }
    catch(_) { uiAlert('Не удалось скопировать'); }
  },
  closeCsvModal: () => { closeCsvModal(); render(); },
  exportData: async () => { await exportData(); },
  importData: () => { document.getElementById('importFile').click(); },
  setFilter: el => {
    state.libFilter = el.dataset.id;
    saveState();
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.id === state.libFilter);
    });
    const list = $('libList');
    if (list) list.innerHTML = renderLibraryList();
    syncTelegramUI();
  },
  pickExercise: el => pickExercise(el.dataset.id),
  addExToDay: el => addExToDay(el.dataset.day, el.dataset.ex),
  removeExFromDay: el => removeExFromDay(el.dataset.day, el.dataset.ex),
  closeAddDialog: () => closeAddDialog(),
  nextDay: el => goNextDay(el.dataset.id),
  restPlus: () => adjustRest(15), restMinus: () => adjustRest(-15), restSkip: () => skipRest(),
  incW: () => adjustWeight(getCurrentEx()?.inc || 2.5), decW: () => adjustWeight(-(getCurrentEx()?.inc || 2.5)),
  incR: () => adjustReps(getCurrentEx()?.unit === 'свой вес' ? 5 : 1), decR: () => adjustReps(getCurrentEx()?.unit === 'свой вес' ? -5 : -1),
  editDay: el => editDay(el.dataset.id), closeDayEdit: () => closeDayEdit(),
  addExFromDayEdit: () => addExFromDayEdit(),
  moveEx: el => moveExercise(el.dataset.day, Number(el.dataset.idx), Number(el.dataset.dir)),
  removeExFromDayEdit: el => removeExFromDayEdit(el.dataset.day, Number(el.dataset.idx)),
  deleteDay: el => deleteDay(el.dataset.id)
};

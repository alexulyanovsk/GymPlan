import { DEFAULT_STATE, EXERCISES, LIMITS } from './data.js';
import { dbSet, dbGet } from './db.js';
import { uiAlert } from './bridge.js';

export let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

let saveTimer = null;
const inDaysCache = new Map();
const lastAttemptCache = new Map();

export function invalidatePlanCaches() { inDaysCache.clear(); }
export function invalidateHistoryCaches() { lastAttemptCache.clear(); }

/**
 * Возвращает схему упражнения с учётом overrides в дне (schemes).
 * Не мутирует EXERCISES.
 */
export function getExScheme(dayId, exId) {
  const base = EXERCISES[exId];
  if (!base) return null;
  const day = dayId ? state.plans[dayId] : null;
  const o = day?.schemes?.[exId];
  if (!o) return base;
  return {
    ...base,
    sets: Number.isFinite(o.sets) ? o.sets : base.sets,
    repMin: Number.isFinite(o.repMin) ? o.repMin : base.repMin,
    repMax: Number.isFinite(o.repMax) ? o.repMax : base.repMax
  };
}

function sanitizeDaySchemes(d, exIdSet) {
  if (!d.schemes || typeof d.schemes !== 'object' || Array.isArray(d.schemes)) {
    d.schemes = {};
    return;
  }
  for (const exId of Object.keys(d.schemes)) {
    if (!exIdSet.has(exId)) { delete d.schemes[exId]; continue; }
    const s = d.schemes[exId];
    if (!s || typeof s !== 'object' || Array.isArray(s)) { delete d.schemes[exId]; continue; }
    const sets = Number(s.sets);
    const repMin = Number(s.repMin);
    const repMax = Number(s.repMax);
    if (!Number.isFinite(sets) || sets < 1 || sets > 20 ||
        !Number.isFinite(repMin) || repMin < 1 || repMin > 200 ||
        !Number.isFinite(repMax) || repMax < repMin || repMax > 500) {
      delete d.schemes[exId];
      continue;
    }
    d.schemes[exId] = { sets, repMin, repMax };
  }
}

export function sanitizeState() {
  if (!state.plans || typeof state.plans !== 'object' || Array.isArray(state.plans)) state.plans = {};
  for (const id of Object.keys(state.plans)) {
    const d = state.plans[id];
    if (!d || typeof d !== 'object' || typeof d.title !== 'string') { delete state.plans[id]; continue; }
    if (!Array.isArray(d.exercises)) d.exercises = [];
    d.exercises = d.exercises.filter(exId => EXERCISES[exId]);
    sanitizeDaySchemes(d, new Set(d.exercises));
  }

  if (!Array.isArray(state.history)) state.history = [];
  state.history = state.history.filter(h => h && typeof h.ts === 'number' && Array.isArray(h.exercises));
  state.history.forEach(h => {
    if (typeof h.dayId !== 'string') h.dayId = '';
    if (typeof h.dayTitle !== 'string') h.dayTitle = '';
    h.exercises = h.exercises.filter(r => r && typeof r.id === 'string' && EXERCISES[r.id] && Array.isArray(r.sets));
    h.exercises.forEach(r => {
      r.sets = r.sets
        .map(s => {
          if (!s || typeof s !== 'object') return null;
          const w = Number(s.weight);
          const rp = Number(s.reps);
          if (!Number.isFinite(w) || !Number.isFinite(rp) || rp < 1) return null;
          return { weight: w, reps: rp };
        })
        .filter(Boolean);
      if (typeof r.note !== 'string') r.note = '';
      if (typeof r.name !== 'string') r.name = EXERCISES[r.id].name;
    });
    h.exercises = h.exercises.filter(r => r.sets.length > 0);
  });
  state.history = state.history.filter(h => h.exercises.length > 0);
  state.history.sort((a, b) => b.ts - a.ts);
  if (state.history.length > LIMITS.historyMax) state.history.length = LIMITS.historyMax;

  if (!state.weights || typeof state.weights !== 'object' || Array.isArray(state.weights)) state.weights = {};
  for (const id of Object.keys(state.weights)) {
    if (!EXERCISES[id]) { delete state.weights[id]; continue; }
    const w = state.weights[id];
    if (!w || typeof w !== 'object') { delete state.weights[id]; continue; }
    const numW = Number(w.weight);
    const numR = Number(w.reps);
    if (!Number.isFinite(numW) || numW < 0) { delete state.weights[id]; continue; }
    state.weights[id] = {
      weight: numW,
      reps: Number.isFinite(numR) && numR >= 1 ? numR : 1
    };
  }

  if (state.workout) {
    const w = state.workout;
    const day = state.plans[w.dayId];
    if (!day || !day.exercises.length) {
      state.workout = null;
      if (state.screen === 'workout') state.screen = 'menu';
    } else {
      if (!Array.isArray(w.tempSets)) w.tempSets = [];
      w.tempSets = w.tempSets
        .map(s => {
          if (!s) return null;
          const wt = Number(s.weight);
          const rp = Number(s.reps);
          if (!Number.isFinite(wt) || !Number.isFinite(rp) || rp < 1) return null;
          return { weight: wt, reps: rp };
        })
        .filter(Boolean);
      if (!Array.isArray(w.results)) w.results = [];
      if (typeof w.exIdx !== 'number' || w.exIdx < 0) w.exIdx = 0;
      if (w.exIdx >= day.exercises.length) { w.exIdx = day.exercises.length - 1; w.tempSets = []; }
      const numW = Number(w.currentWeight);
      if (!Number.isFinite(numW) || numW < 0) w.currentWeight = 0; else w.currentWeight = numW;
      const numR = Number(w.currentReps);
      if (!Number.isFinite(numR) || numR < 1) w.currentReps = 1; else w.currentReps = numR;
      if (typeof w.currentNote !== 'string') w.currentNote = '';
    }
  }

  if (typeof state.lastCompletedTs !== 'number' || !Number.isFinite(state.lastCompletedTs)) state.lastCompletedTs = 0;
  if (state.currentDayId && !state.plans[state.currentDayId]) state.currentDayId = null;
  if (state.editingDayId && !state.plans[state.editingDayId]) state.editingDayId = null;
  if (state.pickForDayId && !state.plans[state.pickForDayId]) state.pickForDayId = null;

  const validScreens = ['menu', 'workout', 'complete', 'library', 'history', 'dayEdit'];
  if (!validScreens.includes(state.screen)) state.screen = 'menu';
  if (state.screen === 'workout' && !state.workout) state.screen = 'menu';
  if (state.screen === 'complete') {
    const h0 = state.history[0];
    if (!h0 || h0.ts !== state.lastCompletedTs) state.screen = 'menu';
  }
  if (state.screen === 'dayEdit' && !state.editingDayId) state.screen = 'menu';
  if (state.rest && (typeof state.rest.endsAt !== 'number' || !Number.isFinite(state.rest.endsAt) || state.rest.endsAt < Date.now())) state.rest = null;
  if (typeof state.generatorOpen !== 'boolean') state.generatorOpen = false;
  if (typeof state.libFilter !== 'string') state.libFilter = 'Все';

  invalidatePlanCaches();
  invalidateHistoryCaches();
}

export async function loadState() {
  let savedState = null;
  try {
    savedState = await dbGet('full_state');
  } catch (e) {
    console.warn('[GymPlan] DB Load error', e);
  }

  let emergencyState = null;
  try {
    const emStr = localStorage.getItem('gymplan_emergency');
    if (emStr) {
      const parsed = JSON.parse(emStr);
      if (!savedState || (parsed._lastSavedTs && parsed._lastSavedTs > (savedState._lastSavedTs || 0))) {
        emergencyState = parsed;
      }
    }
  } catch(_) {}

  const source = emergencyState || savedState;
  if (source && typeof source === 'object') {
    if (source.plans && typeof source.plans === 'object') state.plans = source.plans;
    if (source.screen) state.screen = source.screen;
    if (source.currentDayId) state.currentDayId = source.currentDayId;
    if (source.workout) state.workout = source.workout;
    if (Array.isArray(source.history)) state.history = source.history;
    if (source.weights && typeof source.weights === 'object') state.weights = source.weights;
    if (typeof source.lastCompletedTs === 'number') state.lastCompletedTs = source.lastCompletedTs;
    if (typeof source._lastSavedTs === 'number') state._lastSavedTs = source._lastSavedTs;
    if (typeof source.generatorOpen === 'boolean') state.generatorOpen = source.generatorOpen;
    if (typeof source.libFilter === 'string') state.libFilter = source.libFilter;
  }

  sanitizeState();

  try {
    const restStr = localStorage.getItem('gym_rest_v5');
    if (restStr) {
      const p = JSON.parse(restStr);
      if (p && typeof p.endsAt === 'number' && p.endsAt > Date.now()) state.rest = p;
    }
  } catch(_) {}

  // Если emergency-снимок содержал rest — восстановим
  if (!state.rest && source && source.rest && typeof source.rest.endsAt === 'number' && source.rest.endsAt > Date.now()) {
    state.rest = source.rest;
  }
}

export async function flushNow() {
  try {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    state._lastSavedTs = Date.now();
    const stateToSave = JSON.parse(JSON.stringify({
      plans: state.plans,
      screen: state.screen,
      currentDayId: state.currentDayId,
      workout: state.workout,
      history: state.history,
      weights: state.weights,
      lastCompletedTs: state.lastCompletedTs,
      _lastSavedTs: state._lastSavedTs,
      generatorOpen: state.generatorOpen,
      libFilter: state.libFilter     // ← сохраняем фильтр библиотеки
    }));
    await dbSet('full_state', stateToSave);
    try { localStorage.removeItem('gymplan_emergency'); } catch(_) {}

    if (state.rest) {
      try { localStorage.setItem('gym_rest_v5', JSON.stringify(state.rest)); } catch(_) {}
    } else {
      try { localStorage.removeItem('gym_rest_v5'); } catch(_) {}
    }
  } catch (e) {
    console.warn('[GymPlan] DB Save error', e);
  }
}

export function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushNow, 500);
}

export async function exportData() {
  await flushNow();
  let data = null;
  try { data = await dbGet('full_state'); } catch(_) {}
  if (!data) {
    data = {
      plans: state.plans, screen: state.screen, currentDayId: state.currentDayId,
      workout: state.workout, history: state.history, weights: state.weights,
      lastCompletedTs: state.lastCompletedTs, _lastSavedTs: Date.now(),
      libFilter: state.libFilter
    };
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymplan_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MAX_IMPORT_SIZE = 5 * 1024 * 1024;

export async function importData(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('No file')); return; }
    if (file.size > MAX_IMPORT_SIZE) { reject(new Error('Файл слишком большой (макс. 5 МБ)')); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Некорректный формат файла');
        if (data.plans !== undefined && (typeof data.plans !== 'object' || Array.isArray(data.plans))) throw new Error('Некорректное поле plans');
        if (data.history !== undefined && !Array.isArray(data.history)) throw new Error('Некорректное поле history');
        if (data.weights !== undefined && (typeof data.weights !== 'object' || Array.isArray(data.weights))) throw new Error('Некорректное поле weights');

        // Фиксированный ключ бэкапа — не копим записи
        try {
          const current = await dbGet('full_state');
          if (current) await dbSet('full_state_backup', current);
        } catch(_) {}

        await dbSet('full_state', data);

        try { localStorage.removeItem('gymplan_emergency'); } catch(_) {}
        try { localStorage.removeItem('gym_rest_v5'); } catch(_) {}

        state.plans = {};
        state.history = [];
        state.weights = {};
        state.workout = null;
        state.currentDayId = null;
        state.screen = 'menu';
        state.rest = null;
        state.lastCompletedTs = 0;
        state.editingDayId = null;
        state.pickForDayId = null;
        state.pendingAdd = null;
        state.newDayOpen = false;
        state.generatorOpen = false;
        state.libFilter = 'Все';
        state.libSearch = '';

        await loadState();
        sanitizeState();
        invalidatePlanCaches();
        invalidateHistoryCaches();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Read error'));
    reader.readAsText(file);
  });
}

export function getCurrentEx() {
  const w = state.workout; if (!w) return null;
  const day = state.plans[w.dayId]; if (!day) return null;
  return getExScheme(w.dayId, day.exercises[w.exIdx]) || null;
}

export function getLastAttempt(exId) {
  if (lastAttemptCache.has(exId)) return lastAttemptCache.get(exId);
  let res = null;
  for (const h of state.history) {
    if (!Array.isArray(h.exercises)) continue;
    const f = h.exercises.find(x => x && x.id === exId);
    if (f && Array.isArray(f.sets) && f.sets.length) { res = f.sets; break; }
  }
  lastAttemptCache.set(exId, res);
  return res;
}

export function progressionHint(dayId, exId) {
  const ex = getExScheme(dayId, exId); if (!ex) return null;
  if (ex.unit === 'свой вес') return null;
  const cutoff = Date.now() - LIMITS.progressionWindowMs;
  const att = [];
  for (const h of state.history) {
    if (h.ts < cutoff) break;
    if (!Array.isArray(h.exercises)) continue;
    const f = h.exercises.find(x => x && x.id === exId);
    if (f && Array.isArray(f.sets) && f.sets.length) att.push(f.sets);
    if (att.length >= 2) break;
  }
  if (att.length < 2) return null;
  return att.every(s => s.length >= ex.sets && s.every(r => r && Number.isFinite(r.reps) && r.reps >= ex.repMax))
    ? `🎯 Пора +${ex.inc} ${ex.unit}` : null;
}

export function startValues(dayId, exId) {
  const ex = getExScheme(dayId, exId);
  if (!ex) return { weight: 0, reps: 1 };
  const s = state.weights[exId];
  if (s && Number.isFinite(s.weight)) return { weight: s.weight, reps: s.reps || ex.repMax };
  const l = getLastAttempt(exId);
  if (l && l.length) return { weight: l[l.length - 1].weight, reps: l[l.length - 1].reps };
  return { weight: ex.wMin, reps: ex.repMax };
}

export function getInDays(exId) {
  if (inDaysCache.has(exId)) return inDaysCache.get(exId);
  const res = Object.entries(state.plans).filter(([_, d]) => d.exercises.includes(exId)).map(([dId]) => {
    const t = state.plans[dId]?.title || '';
    const p = t.split('·');
    return p.length > 1 ? p[1].trim() : t;
  });
  inDaysCache.set(exId, res);
  return res;
}

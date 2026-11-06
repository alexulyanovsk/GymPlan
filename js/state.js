import { DEFAULT_STATE, EXERCISES, LIMITS } from './data.js';
import { dbSet, dbGet } from './db.js';
import { uiAlert } from './bridge.js';

export let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

let saveTimer = null;
let pendingDropAlerts = [];
const inDaysCache = new Map();
const lastAttemptCache = new Map();

export function invalidatePlanCaches() { inDaysCache.clear(); }
export function invalidateHistoryCaches() { lastAttemptCache.clear(); }

export function sanitizeState() {
  if (!state.plans || typeof state.plans !== 'object' || Array.isArray(state.plans)) state.plans = {};
  for (const id of Object.keys(state.plans)) {
    const d = state.plans[id];
    if (!d || typeof d !== 'object' || typeof d.title !== 'string') { delete state.plans[id]; continue; }
    if (!Array.isArray(d.exercises)) d.exercises = [];
    d.exercises = d.exercises.filter(exId => EXERCISES[exId]);
  }
  if (!Array.isArray(state.history)) state.history = [];
  state.history = state.history.filter(h => h && typeof h.ts === 'number' && Array.isArray(h.exercises));
  state.history.forEach(h => {
    if (typeof h.dayId !== 'string') h.dayId = '';
    if (typeof h.dayTitle !== 'string') h.dayTitle = '';
    h.exercises = h.exercises.filter(r => r && typeof r.id === 'string' && EXERCISES[r.id] && Array.isArray(r.sets));
    h.exercises.forEach(r => {
      r.sets = r.sets.filter(s => s && isFinite(s.weight) && isFinite(s.reps) && s.reps >= 1);
      if (typeof r.note !== 'string') r.note = '';
      if (typeof r.name !== 'string') r.name = EXERCISES[r.id].name;
    });
  });
  state.history = state.history.filter(h => h.exercises.length > 0);
  state.history.sort((a, b) => b.ts - a.ts);
  
  if (!state.weights || typeof state.weights !== 'object' || Array.isArray(state.weights)) state.weights = {};
  for (const id of Object.keys(state.weights)) {
    if (!EXERCISES[id]) { delete state.weights[id]; continue; }
    const w = state.weights[id];
    if (!w || typeof w !== 'object' || !isFinite(Number(w.weight))) delete state.weights[id];
  }
  if (state.workout) {
    const w = state.workout;
    const day = state.plans[w.dayId];
    if (!day || !day.exercises.length) {
      state.workout = null;
      if (state.screen === 'workout') state.screen = 'menu';
    } else {
      if (!Array.isArray(w.tempSets)) w.tempSets = [];
      w.tempSets = w.tempSets.filter(s => s && isFinite(s.weight) && isFinite(s.reps) && s.reps >= 1);
      if (!Array.isArray(w.results)) w.results = [];
      if (typeof w.exIdx !== 'number' || w.exIdx < 0) w.exIdx = 0;
      if (w.exIdx >= day.exercises.length) { w.exIdx = day.exercises.length - 1; w.tempSets = []; }
      const numW = Number(w.currentWeight);
      if (!isFinite(numW) || numW < 0) w.currentWeight = 0; else w.currentWeight = numW;
      const numR = Number(w.currentReps);
      if (!isFinite(numR) || numR < 1) w.currentReps = 1; else w.currentReps = numR;
      if (typeof w.currentNote !== 'string') w.currentNote = '';
    }
  }
  if (typeof state.lastCompletedTs !== 'number' || !isFinite(state.lastCompletedTs)) state.lastCompletedTs = 0;
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
  if (state.rest && (typeof state.rest.endsAt !== 'number' || !isFinite(state.rest.endsAt) || state.rest.endsAt < Date.now())) state.rest = null;
  if (typeof state.generatorOpen !== 'boolean') state.generatorOpen = false;
  invalidatePlanCaches();
  invalidateHistoryCaches();
}

export async function loadState() {
  let savedState = null;
  try {
    savedState = await dbGet('full_state');
  } catch (e) {
    console.warn("DB Load error", e);
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
  if (source) {
    state.plans = source.plans || state.plans;
    state.screen = source.screen || state.screen;
    state.currentDayId = source.currentDayId || null;
    state.workout = source.workout || null;
    state.history = source.history || [];
    state.weights = source.weights || {};
    state.lastCompletedTs = source.lastCompletedTs || 0;
    state._lastSavedTs = source._lastSavedTs || 0;
    if (typeof source.generatorOpen === 'boolean') state.generatorOpen = source.generatorOpen;
  }

  sanitizeState();
  try {
    const restStr = localStorage.getItem('gym_rest_v5');
    if (restStr) {
      const p = JSON.parse(restStr);
      if (p && p.endsAt > Date.now()) state.rest = p;
    }
  } catch(_) {}
}

export async function flushNow() {
  try {
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
      generatorOpen: state.generatorOpen
    }));
    await dbSet('full_state', stateToSave);
    
    localStorage.removeItem('gymplan_emergency');

    if (state.rest) localStorage.setItem('gym_rest_v5', JSON.stringify(state.rest));
    else localStorage.removeItem('gym_rest_v5');

    if (pendingDropAlerts.length) {
      const toAlert = pendingDropAlerts.slice();
      pendingDropAlerts = [];
      uiAlert(toAlert.join('\n'));
    }
  } catch (e) {
    console.warn("DB Save error", e);
  }
}

export function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushNow, 500);
}

export async function exportData() {
  const data = (await dbGet('full_state')) || {};
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymplan_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid data');
        await dbSet('full_state', data);
        await loadState();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

export function getCurrentEx() {
  const w = state.workout; if (!w) return null;
  const day = state.plans[w.dayId]; if (!day) return null;
  return EXERCISES[day.exercises[w.exIdx]] || null;
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

export function progressionHint(exId) {
  const ex = EXERCISES[exId]; if (!ex) return null;
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
  return att.every(s => s.length >= ex.sets && s.every(r => r && isFinite(r.reps) && r.reps >= ex.repMax)) ? `🎯 Пора +${ex.inc} ${ex.unit}` : null;
}

export function startValues(exId) {
  const ex = EXERCISES[exId]; const s = state.weights[exId];
  if (s && isFinite(s.weight)) return { weight: s.weight, reps: s.reps || ex.repMax };
  const l = getLastAttempt(exId); if (l) return { weight: l[l.length - 1].weight, reps: l[l.length - 1].reps };
  return { weight: ex.wMin, reps: ex.repMax };
}

export function getInDays(exId) {
  if (inDaysCache.has(exId)) return inDaysCache.get(exId);
  const res = Object.entries(state.plans).filter(([_, d]) => d.exercises.includes(exId)).map(([dId]) => {
    const t = state.plans[dId]?.title || ''; const p = t.split('·'); return p.length > 1 ? p[1].trim() : t;
  });
  inDaysCache.set(exId, res);
  return res;
}

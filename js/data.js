// В самом конце файла data.js:

// Оставляем DEFAULT_PLANS как справочник (вдруг пригодится для тестов), 
// но в DEFAULT_STATE передаем пустой объект.
export const DEFAULT_PLANS = {
  push_a: { title: 'День 1 · Push A', exercises: ['bp_smith', 'sh_db_press', 'bp_hammer', 'bp_db_fly', 'tri_rope'] },
  pull_a: { title: 'День 2 · Pull A', exercises: ['back_pulldown', 'back_row_low', 'back_row_up', 'back_rear_delt', 'bi_db_sit'] },
  push_b: { title: 'День 3 · Push B', exercises: ['bp_incline_db', 'sh_lateral_sit', 'tri_bar', 'tri_overhead'] },
  pull_b: { title: 'День 4 · Pull B', exercises: ['back_pulldown_close', 'back_tbar', 'back_rear_delt', 'bi_cable_sit', 'bi_hammer'] },
};

export const DEFAULT_STATE = {
  plans: {}, // <--- ТЕПЕРЬ ПУСТО
  screen: 'menu', currentDayId: null, workout: null, weights: {}, history: [],
  lastCompletedTs: 0, _lastSavedTs: 0,
  libFilter: 'Все', libSearch: '', pendingAdd: null, newDayOpen: false, newDayName: '',
  editingDayId: null, pickForDayId: null, rest: null, generatorOpen: false
};

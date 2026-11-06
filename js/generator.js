/**
 * Файл: js/generator.js
 * Версия: 2.1.0
 * Описание: Схемы подходов сохраняются в самом дне, а не мутируют EXERCISES.
 */

import { EXERCISES, EX_ENTRIES } from './data.js';

const EQUIPMENT_MAP = {
  barbell: ['bp_smith', 'bp_incline_bb', 'bp_decline_bb', 'back_deadlift', 'back_barbell_row', 'back_rack_pull', 'sh_ohp', 'sh_upright_row', 'bi_bb_curl', 'bi_reverse_curl', 'bi_drag_curl', 'tri_close_grip', 'tri_skullcrusher', 'tri_floor_press', 'leg_press', 'barbell_squat', 'hack_squat', 'front_squat', 'smith_squat', 'romanian_deadlift', 'stiff_leg_deadlift', 'good_morning', 'hip_thrust', 'smith_hip_thrust', 'barbell_calf_raise', 'smith_calf_raise', 'seated_barbell_calf', 'back_shrugs'],
  dumbbell: ['bp_db_flat', 'bp_incline_db', 'bp_db_fly', 'bp_pullover', 'bp_decline_db', 'bp_svend_press', 'back_db_row', 'sh_db_press', 'sh_lateral_sit', 'sh_front_raise', 'sh_arnold_press', 'sh_push_press', 'sh_db_lateral_standing', 'sh_rear_delt_fly', 'sh_incline_reverse_fly', 'sh_single_arm_reverse_fly', 'sh_prone_reverse_fly', 'sh_seated_rear_delt', 'bi_db_sit', 'bi_hammer', 'bi_db_curl', 'bi_concentration', 'bi_incline_curl', 'bi_spider_curl', 'tri_db_overhead', 'tri_kickback', 'tri_tate_press', 'dumbbell_lunge', 'dumbbell_rdl', 'glute_bridge', 'sumo_squat', 'dumbbell_calf_raise'],
  machine: ['bp_hammer', 'bp_pec_deck', 'back_pulldown', 'back_row_low', 'back_row_up', 'back_tbar', 'back_pulldown_close', 'back_chest_supported', 'sh_machine_press', 'sh_machine_lateral', 'back_rear_delt', 'sh_machine_rear_delt', 'sh_reverse_pec_deck', 'bi_scott', 'bi_preacher_machine', 'tri_rope', 'tri_bar', 'tri_overhead', 'tri_single_arm', 'tri_reverse_grip', 'leg_press', 'leg_extension', 'hack_squat', 'lying_leg_curl', 'seated_leg_curl', 'single_leg_curl', 'cable_kickback', 'hip_abduction', 'hip_adduction', 'standing_calf_raise', 'seated_calf_raise', 'calf_press', 'toe_press', 'leg_press_calf', 'calf_extension_machine'],
  bodyweight: ['bp_dips', 'bp_pushup', 'back_pullups', 'back_inverted_row', 'tri_bench_dips', 'tri_diamond', 'core_plank', 'core_bird_dog', 'core_crunches', 'core_leg_raise', 'core_side_plank_rot', 'core_hollow_hold', 'core_v_up', 'core_dead_bug', 'bulgarian_split', 'step_up', 'sissy_squat', 'single_leg_glute_bridge', 'single_leg_calf_raise', 'reverse_calf_raise', 'jump_rope', 'nordic_curl'],
  cable: ['bp_crossover', 'bp_cable_fly', 'back_straight_arm', 'sh_cable_lateral', 'sh_cable_front', 'sh_cable_reverse_fly', 'sh_face_pull_sit', 'sh_bent_over_cable', 'bi_cable_sit', 'bi_high_cable', 'core_pallof', 'core_cable_crunch', 'cable_rdl', 'cable_side_kick', 'cable_pull_through', 'cable_kickback']
};

const COMPOUNDS = {
  'Грудь': ['bp_smith', 'bp_db_flat', 'bp_incline_db', 'bp_hammer', 'bp_incline_bb', 'bp_dips', 'bp_pushup'],
  'Спина': ['back_pulldown', 'back_row_low', 'back_tbar', 'back_deadlift', 'back_barbell_row', 'back_pullups'],
  'Плечи (Перед/Сред)': ['sh_db_press', 'sh_machine_press', 'sh_ohp'],
  'Плечи (Зад)': ['back_face_pull', 'sh_reverse_pec_deck', 'sh_rear_delt_fly'],
  'Бицепс': ['bi_bb_curl', 'bi_db_curl', 'bi_scott', 'bi_hammer'],
  'Трицепс': ['tri_close_grip', 'tri_rope', 'tri_bar', 'tri_skullcrusher'],
  'Квадрицепс': ['barbell_squat', 'leg_press', 'hack_squat', 'front_squat', 'dumbbell_lunge', 'bulgarian_split'],
  'Бицепс бедра': ['romanian_deadlift', 'lying_leg_curl', 'seated_leg_curl', 'dumbbell_rdl'],
  'Ягодицы': ['hip_thrust', 'glute_bridge', 'cable_kickback', 'hip_abduction'],
  'Икры': ['standing_calf_raise', 'seated_calf_raise', 'calf_press'],
  'Кор': ['core_plank', 'core_crunches', 'core_leg_raise', 'core_cable_crunch', 'core_russian_twist', 'core_ab_rollout']
};

const GROUP_MAPPING = {
  'Грудь': ['Грудь'],
  'Спина': ['Спина'],
  'Плечи': ['Плечи (Перед/Сред)', 'Плечи (Зад)'],
  'Руки': ['Бицепс', 'Трицепс'],
  'Ноги': ['Квадрицепс', 'Бицепс бедра', 'Ягодицы', 'Икры']
};

export function generatePlan(options) {
  const { goal, exp, daysPerWeek, equipment, excludedGroups = [] } = options;

  let availableEx = EX_ENTRIES.filter(([id, ex]) => {
    if (equipment.includes('all')) return true;
    for (const eq of equipment) {
      if (EQUIPMENT_MAP[eq] && EQUIPMENT_MAP[eq].includes(id)) return true;
      if (eq === 'bodyweight' && ex.unit === 'свой вес') return true;
    }
    return false;
  }).map(([id]) => id);

  const includedGroups = Object.keys(GROUP_MAPPING).filter(g => !excludedGroups.includes(g));
  if (includedGroups.length < 2) return null;

  const excludedRawMuscles = excludedGroups.flatMap(g => GROUP_MAPPING[g] || []);
  availableEx = availableEx.filter(id => !excludedRawMuscles.includes(EXERCISES[id].muscle));

  if (availableEx.length < 10) return null;

  let sets = 3, repMin = 8, repMax = 12;
  if (goal === 'strength') { sets = 4; repMin = 4; repMax = 6; }
  if (goal === 'endurance') { sets = 3; repMin = 15; repMax = 20; }
  if (exp === 'beginner') sets = Math.max(2, sets - 1);
  if (exp === 'advanced') sets += 1;

  const hasLegs = !excludedGroups.includes('Ноги');
  const plans = {};

  const createDay = (title, targetRawMuscles) => {
    const exercises = [];
    const shuffledMuscles = [...targetRawMuscles].sort(() => Math.random() - 0.5);

    shuffledMuscles.forEach(mg => {
      const compounds = COMPOUNDS[mg] || [];
      const availableCompounds = compounds.filter(id => availableEx.includes(id));
      const isolations = availableEx.filter(id => EXERCISES[id].muscle === mg && !compounds.includes(id));

      if (availableCompounds.length > 0) exercises.push(availableCompounds[0]);
      if (isolations.length > 0) exercises.push(isolations[Math.floor(Math.random() * isolations.length)]);
      if (exp === 'advanced' && isolations.length > 1) exercises.push(isolations[1]);
    });

    if (!excludedGroups.includes('Кор')) {
      const coreCompounds = COMPOUNDS['Кор'] || [];
      const availableCore = coreCompounds.filter(id => availableEx.includes(id));
      if (availableCore.length > 0) {
        exercises.push(availableCore[Math.floor(Math.random() * availableCore.length)]);
      }
    }

    const trimmed = exercises.slice(0, 7);
    const schemes = {};
    trimmed.forEach(id => { schemes[id] = { sets, repMin, repMax }; });
    return { title, exercises: trimmed, schemes };
  };

  if (hasLegs) {
    if (daysPerWeek === 2) {
      plans['gen_full_1'] = createDay('День 1 · Full Body A', ['Грудь', 'Спина', 'Квадрицепс', 'Бицепс бедра']);
      plans['gen_full_2'] = createDay('День 2 · Full Body B', ['Плечи (Перед/Сред)', 'Ягодицы', 'Бицепс', 'Трицепс']);
    } else if (daysPerWeek === 3) {
      plans['gen_push'] = createDay('День 1 · Push', ['Грудь', 'Плечи (Перед/Сред)', 'Трицепс']);
      plans['gen_pull'] = createDay('День 2 · Pull', ['Спина', 'Плечи (Зад)', 'Бицепс']);
      plans['gen_legs'] = createDay('День 3 · Legs', ['Квадрицепс', 'Бицепс бедра', 'Ягодицы']);
    } else {
      plans['gen_upper_1'] = createDay('День 1 · Upper A', ['Грудь', 'Спина', 'Плечи (Перед/Сред)', 'Трицепс']);
      plans['gen_lower_1'] = createDay('День 2 · Lower A', ['Квадрицепс', 'Бицепс бедра', 'Ягодицы', 'Икры']);
      plans['gen_upper_2'] = createDay('День 3 · Upper B', ['Плечи (Зад)', 'Бицепс', 'Трицепс']);
      plans['gen_lower_2'] = createDay('День 4 · Lower B', ['Квадрицепс', 'Бицепс бедра', 'Ягодицы']);
    }
  } else {
    if (daysPerWeek === 2) {
      plans['gen_upper_1'] = createDay('День 1 · Верх A', ['Грудь', 'Спина', 'Плечи (Перед/Сред)', 'Трицепс']);
      plans['gen_upper_2'] = createDay('День 2 · Верх B', ['Плечи (Зад)', 'Бицепс', 'Трицепс']);
    } else if (daysPerWeek === 3) {
      plans['gen_push_1'] = createDay('День 1 · Push', ['Грудь', 'Плечи (Перед/Сред)', 'Трицепс']);
      plans['gen_pull_1'] = createDay('День 2 · Pull', ['Спина', 'Плечи (Зад)', 'Бицепс']);
      plans['gen_push_2'] = createDay('День 3 · Push B', ['Грудь', 'Плечи (Перед/Сред)', 'Трицепс']);
    } else {
      plans['gen_push_1'] = createDay('День 1 · Push A', ['Грудь', 'Плечи (Перед/Сред)', 'Трицепс']);
      plans['gen_pull_1'] = createDay('День 2 · Pull A', ['Спина', 'Плечи (Зад)', 'Бицепс']);
      plans['gen_push_2'] = createDay('День 3 · Push B', ['Грудь', 'Плечи (Перед/Сред)', 'Трицепс']);
      plans['gen_pull_2'] = createDay('День 4 · Pull B', ['Спина', 'Плечи (Зад)', 'Бицепс']);
    }
  }

  return plans;
}

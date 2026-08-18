import type { MuscleCategory, MuscleGroup } from '../db/entities';

export interface MuscleGroupOption {
  value: MuscleGroup;
  label: string;
}

export interface MuscleCategoryInfo {
  value: MuscleCategory;
  label: string;
  options: readonly MuscleGroupOption[];
}

export const MUSCLE_CATEGORIES: readonly MuscleCategoryInfo[] = [
  {
    value: 'chest',
    label: 'Грудь',
    options: [
      { value: 'chest', label: 'Грудь' },
      { value: 'chest_upper', label: 'Грудь (верх)' },
      { value: 'chest_mid', label: 'Грудь (середина)' },
      { value: 'chest_lower', label: 'Грудь (низ)' }
    ]
  },
  {
    value: 'back',
    label: 'Спина',
    options: [
      { value: 'back', label: 'Спина' },
      { value: 'back_lats', label: 'Широчайшие' },
      { value: 'back_upper', label: 'Верх спины' },
      { value: 'back_lower', label: 'Поясница' },
      { value: 'back_traps', label: 'Трапеции' }
    ]
  },
  {
    value: 'legs',
    label: 'Ноги',
    options: [
      { value: 'legs', label: 'Ноги' },
      { value: 'legs_quads', label: 'Квадрицепсы' },
      { value: 'legs_hamstrings', label: 'Бицепс бедра' },
      { value: 'legs_glutes', label: 'Ягодицы' },
      { value: 'legs_calves', label: 'Икры' }
    ]
  },
  {
    value: 'shoulders',
    label: 'Плечи',
    options: [
      { value: 'shoulders', label: 'Плечи' },
      { value: 'shoulders_front', label: 'Передняя дельта' },
      { value: 'shoulders_side', label: 'Средняя дельта' },
      { value: 'shoulders_rear', label: 'Задняя дельта' }
    ]
  },
  {
    value: 'arms',
    label: 'Руки',
    options: [
      { value: 'arms', label: 'Руки' },
      { value: 'arms_biceps', label: 'Бицепс' },
      { value: 'arms_triceps', label: 'Трицепс' },
      { value: 'arms_brachialis', label: 'Брахиалис' },
      { value: 'arms_forearms', label: 'Предплечья' }
    ]
  },
  {
    value: 'abs',
    label: 'Пресс',
    options: [
      { value: 'abs', label: 'Пресс' },
      { value: 'abs_upper', label: 'Верх пресса' },
      { value: 'abs_lower', label: 'Низ пресса' },
      { value: 'abs_obliques', label: 'Косые мышцы' }
    ]
  },
  {
    value: 'cardio',
    label: 'Кардио',
    options: [
      { value: 'cardio', label: 'Кардио' }
    ]
  }
];

export const MUSCLE_GROUPS: readonly MuscleGroup[] = MUSCLE_CATEGORIES.flatMap((category) =>
  category.options.map((option) => option.value)
);

export function getMuscleGroupLabel(group: MuscleGroup): string {
  const option = MUSCLE_CATEGORIES
    .flatMap((category) => category.options)
    .find((candidate) => candidate.value === group);
  return option?.label ?? 'Неизвестная группа';
}

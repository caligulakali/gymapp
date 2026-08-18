import { describe, expect, it } from 'vitest';
import {
  MUSCLE_CATEGORIES,
  MUSCLE_GROUPS,
  getMuscleGroupLabel
} from '../../src/domain/muscle-groups';

const LEGACY_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'abs', 'cardio'] as const;

describe('muscle groups catalog', () => {
  it('defines a non-empty catalog with unique group values', () => {
    expect(MUSCLE_CATEGORIES.length).toBeGreaterThan(0);
    const values = MUSCLE_CATEGORIES.flatMap((category) =>
      category.options.map((option) => option.value)
    );
    expect(new Set(values).size).toBe(values.length);
  });

  it('keeps legacy broad groups valid', () => {
    for (const group of LEGACY_GROUPS) {
      expect(MUSCLE_GROUPS).toContain(group);
    }
  });

  it('defines every legacy group as a selectable category', () => {
    const categoryValues = MUSCLE_CATEGORIES.map((category) => category.value);
    expect(categoryValues).toEqual(expect.arrayContaining([...LEGACY_GROUPS]));
  });

  it('splits arms into biceps, triceps and brachialis', () => {
    expect(MUSCLE_GROUPS).toContain('arms_biceps');
    expect(MUSCLE_GROUPS).toContain('arms_triceps');
    expect(MUSCLE_GROUPS).toContain('arms_brachialis');
  });

  it('groups detailed muscles under their category', () => {
    const arms = MUSCLE_CATEGORIES.find((category) => category.value === 'arms');
    expect(arms?.options.map((option) => option.value)).toEqual(
      expect.arrayContaining(['arms_biceps', 'arms_triceps', 'arms_brachialis'])
    );
  });

  it('labels every category and group', () => {
    for (const category of MUSCLE_CATEGORIES) {
      expect(category.label.trim().length).toBeGreaterThan(0);
      for (const option of category.options) {
        expect(option.label.trim().length).toBeGreaterThan(0);
        expect(getMuscleGroupLabel(option.value)).toBe(option.label);
      }
    }
  });

  it('labels legacy and detailed arms groups', () => {
    expect(getMuscleGroupLabel('arms')).toBe('Руки');
    expect(getMuscleGroupLabel('arms_biceps')).toBe('Бицепс');
    expect(getMuscleGroupLabel('arms_triceps')).toBe('Трицепс');
    expect(getMuscleGroupLabel('arms_brachialis')).toBe('Брахиалис');
  });

  it('splits other categories into detailed groups', () => {
    expect(MUSCLE_GROUPS).toContain('chest_upper');
    expect(MUSCLE_GROUPS).toContain('back_lats');
    expect(MUSCLE_GROUPS).toContain('legs_quads');
    expect(MUSCLE_GROUPS).toContain('shoulders_rear');
    expect(MUSCLE_GROUPS).toContain('abs_obliques');
  });
});

import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { resetDatabase } from '../../src/db/exercise-repository';
import { templateRepository } from '../../src/db/template-repository';

const template = {
  id: 'template-1',
  name: 'Ноги',
  notes: 'Тяжёлая тренировка',
  exercises: [{ exerciseId: 'exercise-1', order: 0, sets: 4, targetReps: 8, targetWeight: 100 }]
};

describe('templateRepository', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('saves and reads a template locally', async () => {
    await templateRepository.save(template);

    await expect(templateRepository.getById(template.id)).resolves.toEqual(template);
  });

  it('updates by stable id without duplicating the template', async () => {
    await templateRepository.save(template);
    await templateRepository.save({ ...template, name: 'Ноги и ягодицы' });

    await expect(templateRepository.getAll()).resolves.toEqual([
      { ...template, name: 'Ноги и ягодицы' }
    ]);
  });

  it('keeps one record when the same template is saved repeatedly', async () => {
    await templateRepository.save(template);
    await templateRepository.save(template);

    await expect(templateRepository.getAll()).resolves.toHaveLength(1);
  });

  it('deletes a template by id', async () => {
    await templateRepository.save(template);
    await templateRepository.remove(template.id);

    await expect(templateRepository.getAll()).resolves.toEqual([]);
  });
});

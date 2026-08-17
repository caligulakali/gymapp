import type { Template } from './entities';
import { getDatabase } from './database';

export const templateRepository = {
  async save(template: Template): Promise<void> {
    await getDatabase().templates.put(template);
  },

  async getAll(): Promise<Template[]> {
    return getDatabase().templates.orderBy('name').toArray();
  },

  async getById(id: string): Promise<Template | undefined> {
    return getDatabase().templates.get(id);
  },

  async remove(id: string): Promise<void> {
    await getDatabase().templates.delete(id);
  }
};

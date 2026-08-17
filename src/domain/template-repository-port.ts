import type { Template } from '../db/entities';

export interface TemplateRepositoryPort {
  getAll(): Promise<Template[]>;
  getById?: (id: string) => Promise<Template | undefined>;
  save(template: Template): Promise<void>;
  remove(id: string): Promise<void>;
}

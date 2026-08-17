import type { Template } from '../db/entities';

export interface TemplateRepositoryPort {
  getAll(): Promise<Template[]>;
  save(template: Template): Promise<void>;
  remove(id: string): Promise<void>;
}

import { useEffect, useState, type FormEvent } from 'react';
import { createTemplate, type TemplateDraft } from '../../domain/template-service';
import type { Exercise, Template, TemplateExercise } from '../../db/entities';
import type { ExerciseRepositoryPort } from '../../domain/exercise-repository-port';
import type { TemplateRepositoryPort } from '../../domain/template-repository-port';
import { ExercisePage } from '../exercises/exercise-page';

type TemplatePageProps = {
  templateRepository: TemplateRepositoryPort;
  exerciseRepository: ExerciseRepositoryPort;
  createId?: () => string;
  onChanged?: () => void;
};

type FormState = Omit<TemplateDraft, 'exercises'> & { exercises: TemplateExercise[] };
const EMPTY_FORM: FormState = { name: '', notes: '', exercises: [] };

function makeId(): string {
  return crypto.randomUUID();
}

export function TemplatePage({ templateRepository, exerciseRepository, createId = makeId, onChanged }: TemplatePageProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [isSelectingExercise, setIsSelectingExercise] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    Promise.all([templateRepository.getAll(), exerciseRepository.getAll()]).then(([loadedTemplates, loadedExercises]) => {
      if (!active) return;
      setTemplates(loadedTemplates);
      setExercises(loadedExercises);
    }).catch(() => {
      if (active) setError('Не удалось загрузить шаблоны и упражнения');
    });
    return () => { active = false; };
  }, [templateRepository, exerciseRepository]);

  function openNewTemplate(): void {
    setEditingId(undefined);
    setForm(EMPTY_FORM);
    setError(undefined);
    setIsEditing(true);
  }

  function closeEditor(): void {
    setEditingId(undefined);
    setForm(EMPTY_FORM);
    setError(undefined);
    setIsSelectingExercise(false);
    setIsEditing(false);
  }

  function startEditing(template: Template): void {
    setEditingId(template.id);
    setForm({ name: template.name, notes: template.notes ?? '', exercises: template.exercises });
    setError(undefined);
    setIsEditing(true);
  }

  function selectExercise(exercise: Exercise): void {
    if (form.exercises.some((item) => item.exerciseId === exercise.id)) {
      setError('Это упражнение уже добавлено в шаблон');
      setIsSelectingExercise(false);
      return;
    }
    setForm((current) => ({ ...current, exercises: [...current.exercises, { exerciseId: exercise.id, order: current.exercises.length, sets: 3, targetReps: 8 }] }));
    setExercises((current) => current.some((item) => item.id === exercise.id) ? current : [...current, exercise]);
    setIsSelectingExercise(false);
  }

  function updateExerciseTarget(index: number, key: 'sets' | 'targetReps' | 'targetWeight', value: string): void {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (!value) {
          if (key === 'sets') return item;
          if (key === 'targetReps') { const { targetReps: _targetReps, ...rest } = item; return rest; }
          const { targetWeight: _targetWeight, ...rest } = item;
          return rest;
        }
        return { ...item, [key]: Number(value) };
      })
    }));
  }

  function removeExercise(index: number): void {
    setForm((current) => ({ ...current, exercises: current.exercises.filter((_, itemIndex) => itemIndex !== index).map((item, order) => ({ ...item, order })) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(undefined);
    try {
      const entity = createTemplate(form, editingId ?? createId());
      await templateRepository.save(entity);
      onChanged?.();
      setTemplates((current) => editingId ? current.map((item) => item.id === editingId ? entity : item) : [...current, entity]);
      closeEditor();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Проверьте данные шаблона');
    }
  }

  async function handleDelete(template: Template): Promise<void> {
    if (!window.confirm(`Удалить шаблон «${template.name}»? История тренировок сохранится.`)) return;
    try {
      await templateRepository.remove(template.id);
      onChanged?.();
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      if (editingId === template.id) closeEditor();
    } catch {
      setError('Не удалось удалить шаблон');
    }
  }

  async function duplicateTemplate(template: Template): Promise<void> {
    const copy: Template = { ...template, id: createId(), name: `${template.name} — копия`, exercises: template.exercises.map((exercise) => ({ ...exercise })) };
    try {
      await templateRepository.save(copy);
      onChanged?.();
      setTemplates((current) => [...current, copy]);
    } catch {
      setError('Не удалось дублировать шаблон');
    }
  }

  if (isSelectingExercise) {
    return <ExercisePage repository={exerciseRepository} onSelectExercise={selectExercise} onBack={() => setIsSelectingExercise(false)} onChanged={onChanged} />;
  }

  if (isEditing) {
    const editorTitle = editingId ? 'Редактировать шаблон' : 'Новый шаблон';
    return <section className="template-page template-editor" aria-labelledby="template-editor-title">
      <header className="editor-header"><button className="editor-back" type="button" aria-label="Назад к шаблонам" onClick={closeEditor}>←</button><div><p className="eyebrow">Конструктор</p><h2 id="template-editor-title">{editorTitle}</h2></div><span className="editor-counter">{form.exercises.length}</span></header>
      <form className="template-form streamlined-form" onSubmit={handleSubmit}>
        <div className="template-basics"><label className="prominent-field"><span>Название шаблона</span><input aria-label="Название шаблона" autoFocus placeholder="Например, верх тела" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span>Заметки шаблона</span><textarea aria-label="Заметки шаблона" placeholder="Фокус тренировки или важные подсказки" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div>
        <section className="routine-builder" aria-labelledby="routine-builder-title"><div className="routine-builder-heading"><div><p className="eyebrow">Порядок выполнения</p><h3 id="routine-builder-title">Упражнения</h3></div><button className="catalogue-add compact-add" type="button" aria-label="Добавить упражнение в шаблон" onClick={() => setIsSelectingExercise(true)}><span aria-hidden="true">＋</span><span>Добавить</span></button></div>
          <div className="template-exercise-list" aria-label="Упражнения шаблона">{form.exercises.map((item, index) => {
            const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
            const name = exercise?.name ?? 'Удалённое упражнение';
            return <article className="template-exercise-card routine-row" key={`${item.exerciseId}-${item.order}`}><span className="routine-order">{String(index + 1).padStart(2, '0')}</span><div className="routine-name"><h3>{name}</h3><small>Рабочие параметры</small></div><div className="routine-targets"><label><span>Подходы</span><input aria-label={`Подходы для ${name}`} type="number" min="1" value={item.sets} onChange={(event) => updateExerciseTarget(index, 'sets', event.target.value)} /></label><label><span>Повторы</span><input aria-label={`Повторы для ${name}`} type="number" min="1" value={item.targetReps ?? ''} onChange={(event) => updateExerciseTarget(index, 'targetReps', event.target.value)} /></label><label><span>Вес, кг</span><input aria-label={`Вес для ${name}`} type="number" min="0" step="0.5" value={item.targetWeight ?? ''} onChange={(event) => updateExerciseTarget(index, 'targetWeight', event.target.value)} /></label></div><button className="card-icon-action danger-button" type="button" aria-label={`Удалить ${name} из шаблона`} onClick={() => removeExercise(index)}>×</button></article>;
          })}</div>
          {form.exercises.length === 0 && <button className="routine-empty" type="button" onClick={() => setIsSelectingExercise(true)}><span aria-hidden="true">＋</span><strong>Добавь первое упражнение</strong><small>Собери последовательность движений</small></button>}
        </section>
        {error && <p role="alert">{error}</p>}
        <div className="editor-actions"><button className="ghost-button" type="button" onClick={closeEditor}>Отмена</button><button className="primary-submit save-template-button" type="submit">{editingId ? 'Сохранить изменения шаблона' : 'Сохранить шаблон'} <span aria-hidden="true">→</span></button></div>
      </form>
    </section>;
  }

  return <section className="template-page catalogue-page" aria-labelledby="template-page-title">
    <header className="catalogue-header"><div><p className="eyebrow">Тренировки</p><h2 id="template-page-title">Шаблоны</h2><p>Собери тренировку один раз и запускай её в одно касание.</p></div><button className="catalogue-add" type="button" aria-label="Новый шаблон" onClick={openNewTemplate}><span aria-hidden="true">＋</span><span>Новый шаблон</span></button></header>
    {error && <p className="catalogue-error" role="alert">{error}</p>}
    <ul className="template-list modern-list" aria-label="Список шаблонов">{templates.map((template, index) => <li className="modern-card template-catalogue-card" key={template.id}><span className="template-card-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div className="template-card-copy"><strong>{template.name}</strong><small>{template.exercises.length} упражнений{template.notes ? ` · ${template.notes}` : ''}</small></div><div className="item-actions"><button className="card-primary-action" type="button" aria-label={`Редактировать шаблон ${template.name}`} onClick={() => startEditing(template)}>Открыть</button><button className="card-icon-action" type="button" aria-label={`Дублировать шаблон ${template.name}`} onClick={() => void duplicateTemplate(template)}>⧉</button><button className="card-icon-action danger-button" type="button" aria-label={`Удалить шаблон ${template.name}`} onClick={() => void handleDelete(template)}>×</button></div></li>)}</ul>
    {templates.length === 0 && <div className="empty-state catalogue-empty"><span aria-hidden="true">▤</span><strong>Пока нет шаблонов</strong><p>Создай последовательность упражнений и начинай тренировку быстрее.</p><button className="empty-action" type="button" onClick={openNewTemplate}>Создать шаблон</button></div>}
  </section>;
}

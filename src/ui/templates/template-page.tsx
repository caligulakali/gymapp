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
};

type FormState = Omit<TemplateDraft, 'exercises'> & { exercises: TemplateExercise[] };

const EMPTY_FORM: FormState = { name: '', notes: '', exercises: [] };

function makeId(): string {
  return crypto.randomUUID();
}

export function TemplatePage({ templateRepository, exerciseRepository, createId = makeId }: TemplatePageProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSelectingExercise, setIsSelectingExercise] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

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

  function selectExercise(exercise: Exercise) {
    if (form.exercises.some((item) => item.exerciseId === exercise.id)) {
      setError('Это упражнение уже добавлено в шаблон');
      setIsSelectingExercise(false);
      return;
    }
    setForm((current) => ({
      ...current,
      exercises: [...current.exercises, {
        exerciseId: exercise.id,
        order: current.exercises.length,
        sets: 3,
        targetReps: 8
      }]
    }));
    setExercises((current) => current.some((item) => item.id === exercise.id) ? current : [...current, exercise]);
    setIsSelectingExercise(false);
  }

  function updateExerciseTarget(index: number, key: 'sets' | 'targetReps' | 'targetWeight', value: string) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (!value) {
          if (key === 'sets') return item;
          if (key === 'targetReps') {
            const { targetReps: _targetReps, ...rest } = item;
            return rest;
          }
          const { targetWeight: _targetWeight, ...rest } = item;
          return rest;
        }
        return { ...item, [key]: Number(value) };
      })
    }));
  }

  function removeExercise(index: number) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.filter((_, itemIndex) => itemIndex !== index).map((item, order) => ({ ...item, order }))
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    try {
      const entity = createTemplate(form, editingId ?? createId());
      await templateRepository.save(entity);
      setTemplates((current) => editingId
        ? current.map((item) => item.id === editingId ? entity : item)
        : [...current, entity]);
      setForm(EMPTY_FORM);
      setEditingId(undefined);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Проверьте данные шаблона');
    }
  }

  function startEditing(template: Template) {
    setEditingId(template.id);
    setForm({ name: template.name, notes: template.notes ?? '', exercises: template.exercises });
  }

  async function handleDelete(template: Template) {
    if (!window.confirm(`Удалить шаблон «${template.name}»? История тренировок сохранится.`)) return;
    try {
      await templateRepository.remove(template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      if (editingId === template.id) {
        setForm(EMPTY_FORM);
        setEditingId(undefined);
      }
    } catch {
      setError('Не удалось удалить шаблон');
    }
  }

  async function duplicateTemplate(template: Template) {
    const copy: Template = {
      ...template,
      id: createId(),
      name: `${template.name} — копия`,
      exercises: template.exercises.map((exercise) => ({ ...exercise }))
    };
    try {
      await templateRepository.save(copy);
      setTemplates((current) => [...current, copy]);
    } catch {
      setError('Не удалось дублировать шаблон');
    }
  }

  if (isSelectingExercise) {
    return <ExercisePage repository={exerciseRepository} onSelectExercise={selectExercise} onBack={() => setIsSelectingExercise(false)} />;
  }

  return (
    <section className="template-page" aria-labelledby="template-page-title">
      <div className="page-heading">
        <p className="eyebrow">Тренировки</p>
        <h2 id="template-page-title">Шаблоны</h2>
        <p>Соберите привычную последовательность упражнений один раз.</p>
      </div>
      <form className="template-form" onSubmit={handleSubmit}>
        <label>Название шаблона<input aria-label="Название шаблона" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Заметки шаблона<textarea aria-label="Заметки шаблона" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <button className="secondary-button add-exercise-button" type="button" onClick={() => setIsSelectingExercise(true)}><span aria-hidden="true">＋</span> Добавить упражнение в шаблон</button>
        <div className="template-exercise-list" aria-label="Упражнения шаблона">{form.exercises.map((item, index) => {
          const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
          const name = exercise?.name ?? item.exerciseId;
          return <article className="template-exercise-card" key={`${item.exerciseId}-${item.order}`}>
            <div><p className="eyebrow">Упражнение {index + 1}</p><h3>{name}</h3></div>
            <label>Подходы для {name}<input aria-label={`Подходы для ${name}`} type="number" min="1" value={item.sets} onChange={(event) => updateExerciseTarget(index, 'sets', event.target.value)} /></label>
            <label>Повторы для {name}<input aria-label={`Повторы для ${name}`} type="number" min="1" value={item.targetReps ?? ''} onChange={(event) => updateExerciseTarget(index, 'targetReps', event.target.value)} /></label>
            <label>Вес для {name}<input aria-label={`Вес для ${name}`} type="number" min="0" step="0.5" value={item.targetWeight ?? ''} onChange={(event) => updateExerciseTarget(index, 'targetWeight', event.target.value)} /></label>
            <div className="template-card-actions">
              <button className="ghost-button danger-button" type="button" aria-label={`Удалить ${name} из шаблона`} onClick={() => removeExercise(index)}>Убрать</button>
            </div>
          </article>;
        })}</div>
        {error && <p role="alert">{error}</p>}
        <button className="primary-submit save-template-button" type="submit"><span aria-hidden="true">✓</span> {editingId ? 'Сохранить изменения шаблона' : 'Сохранить шаблон'}</button>
      </form>
      <ul className="template-list" aria-label="Список шаблонов">{templates.map((template) => <li key={template.id}><div><strong>{template.name}</strong><small>{template.exercises.length} упр.</small></div><div className="item-actions"><button className="ghost-button" type="button" aria-label={`Редактировать шаблон ${template.name}`} onClick={() => startEditing(template)}>Изменить</button><button className="secondary-button" type="button" aria-label={`Дублировать шаблон ${template.name}`} onClick={() => void duplicateTemplate(template)}>Дублировать</button><button className="ghost-button danger-button" type="button" aria-label={`Удалить шаблон ${template.name}`} onClick={() => void handleDelete(template)}>Удалить</button></div></li>)}</ul>
    </section>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { exerciseRepository } from '../db/exercise-repository';
import { templateRepository } from '../db/template-repository';
import { workoutRepository } from '../db/workout-repository';
import { workoutDraftRepository } from '../db/workout-draft-repository';
import { dataTransferRepository } from '../db/data-transfer-repository';
import type { ExerciseRepositoryPort } from '../domain/exercise-repository-port';
import type { TemplateRepositoryPort } from '../domain/template-repository-port';
import type { WorkoutRepositoryPort } from '../domain/workout-repository-port';
import { DashboardPage } from './dashboard-page';
import { HistoryPage } from './history-page';
import { ExercisePage } from './exercises/exercise-page';
import { TemplatePage } from './templates/template-page';
import { WorkoutPage } from './workouts/workout-page';
import { DataTransferPage } from './data-transfer-page';

import type { DataTransferRepositoryPort } from '../domain/data-transfer-repository-port';

type Section = 'home' | 'history' | 'exercises' | 'templates' | 'data-transfer' | 'workout';
type AppProps = { exerciseRepository?: ExerciseRepositoryPort; templateRepository?: TemplateRepositoryPort; workoutRepository?: WorkoutRepositoryPort; dataTransferRepository?: DataTransferRepositoryPort };
type IconName = 'home' | 'history' | 'exercise' | 'template' | 'data' | 'shield';

const navItems: { id: Exclude<Section, 'workout'>; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Обзор', icon: 'home' },
  { id: 'history', label: 'История', icon: 'history' },
  { id: 'exercises', label: 'Упражнения', icon: 'exercise' },
  { id: 'templates', label: 'Шаблоны', icon: 'template' },
  { id: 'data-transfer', label: 'Данные', icon: 'data' }
];

function AppIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5" /><path d="M5.5 9.5v10h13v-10M9 19.5v-6h6v6" /></>,
    history: <><path d="M4.5 5.5h15v14h-15zM8 3v5M16 3v5M4.5 10h15" /><path d="M8 14h3M8 17h6" /></>,
    exercise: <><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" /></>,
    template: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
    data: <><path d="M12 3v12M8 7l4-4 4 4M5 14v5h14v-5" /></>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.8 7.9 7 10 4.2-2.1 7-5.4 7-10V6l-7-3Z" />
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Brand() {
  return <div className="brand" aria-label="GymApp"><span className="brand-mark" aria-hidden="true"><span /></span><span className="brand-name">GYM<span>APP</span></span></div>;
}

export function App({ exerciseRepository: exercises = exerciseRepository, templateRepository: templates = templateRepository, workoutRepository: workouts = workoutRepository, dataTransferRepository: data = dataTransferRepository }: AppProps) {
  const [section, setSection] = useState<Section>('home');
  const [workoutList, setWorkoutList] = useState<Awaited<ReturnType<WorkoutRepositoryPort['getAll']>>>([]);
  const [exerciseList, setExerciseList] = useState<Awaited<ReturnType<ExerciseRepositoryPort['getAll']>>>([]);
  const [templateList, setTemplateList] = useState<Awaited<ReturnType<TemplateRepositoryPort['getAll']>>>([]);
  useEffect(() => { void workouts.getAll().then(setWorkoutList).catch(() => setWorkoutList([])); }, [workouts]);
  useEffect(() => { void Promise.all([exercises.getAll(), templates.getAll()]).then(([nextExercises, nextTemplates]) => { setExerciseList(nextExercises); setTemplateList(nextTemplates); }).catch(() => { setExerciseList([]); setTemplateList([]); }); }, [exercises, templates]);
  const navigate = (next: Section) => setSection(next);
  const reloadAll = () => { void Promise.all([workouts.getAll(), exercises.getAll(), templates.getAll()]).then(([nextWorkouts, nextExercises, nextTemplates]) => { setWorkoutList(nextWorkouts); setExerciseList(nextExercises); setTemplateList(nextTemplates); }); };
  const page = section === 'home' ? <DashboardPage workouts={workoutList} onStartWorkout={() => navigate('workout')} onNavigate={navigate} /> : section === 'history' ? <HistoryPage workouts={workoutList} repository={workouts} templates={templateList} exercises={exerciseList} onChanged={reloadAll} /> : section === 'exercises' ? <ExercisePage repository={exercises} onChanged={reloadAll} /> : section === 'templates' ? <TemplatePage templateRepository={templates} exerciseRepository={exercises} onChanged={reloadAll} /> : section === 'data-transfer' ? <DataTransferPage repository={data} onChanged={reloadAll} /> : <WorkoutPage workoutRepository={workouts} templateRepository={templates} exerciseRepository={exercises} draftRepository={workoutDraftRepository} createId={() => crypto.randomUUID()} now={() => new Date().toISOString()} onSaved={() => { reloadAll(); navigate('history'); }} />;
  const renderNav = (mobile = false) => <nav aria-label={mobile ? 'Мобильная навигация' : 'Основная навигация'}>{navItems.map((item) => {
    const isActive = section === item.id;
    return <button aria-label={item.label} aria-current={isActive ? 'page' : undefined} className={isActive ? 'nav-item active' : 'nav-item'} key={item.id} type="button" onClick={() => navigate(item.id)}><span className="nav-icon"><AppIcon name={item.icon} /></span><span className="nav-label">{item.label}</span></button>;
  })}</nav>;
  return <main className="app-shell"><h1 className="sr-only">GymApp</h1><aside className="sidebar"><Brand /><div className="sidebar-rule" /><p className="sidebar-label">Рабочее пространство</p>{renderNav()}<div className="sidebar-bottom"><div className="privacy-note"><span className="privacy-icon"><AppIcon name="shield" /></span><div><strong>Только на устройстве</strong><small>Приватно · работает офлайн</small></div></div><p className="app-version">GYMAPP · 0.1</p></div></aside><div className="app-main"><header className="mobile-header"><Brand /><span className="offline-badge"><i /> Офлайн</span></header>{page}</div><div className="mobile-nav">{renderNav(true)}</div></main>;
}

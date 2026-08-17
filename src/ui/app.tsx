import { useState } from 'react';
import { exerciseRepository } from '../db/exercise-repository';
import { templateRepository } from '../db/template-repository';
import type { ExerciseRepositoryPort } from '../domain/exercise-repository-port';
import type { TemplateRepositoryPort } from '../domain/template-repository-port';
import { ExercisePage } from './exercises/exercise-page';
import { TemplatePage } from './templates/template-page';

type AppProps = {
  exerciseRepository?: ExerciseRepositoryPort;
  templateRepository?: TemplateRepositoryPort;
};

export function App({ exerciseRepository: repository = exerciseRepository, templateRepository: templates = templateRepository }: AppProps) {
  const [activeSection, setActiveSection] = useState<'home' | 'exercises' | 'templates'>('home');

  return (
    <main className="app-shell">
      <nav className="app-nav" aria-label="Основная навигация">
        <button type="button" onClick={() => setActiveSection('home')}>Главная</button>
        <button type="button" onClick={() => setActiveSection('exercises')}>Упражнения</button>
        <button type="button" onClick={() => setActiveSection('templates')}>Шаблоны</button>
      </nav>
      {activeSection === 'home' ? <section className="welcome-card" aria-labelledby="app-title">
        <p className="eyebrow">Личный журнал</p>
        <h1 id="app-title">GymApp</h1>
        <p className="welcome-copy">Тренируйся. Записывай. Расти.</p>
        <button type="button">Начать тренировку</button>
      </section> : activeSection === 'exercises' ? <ExercisePage repository={repository} /> : <TemplatePage templateRepository={templates} exerciseRepository={repository} />}
    </main>
  );
}

import { useState } from 'react';
import { exerciseRepository } from '../db/exercise-repository';
import type { ExerciseRepositoryPort } from '../domain/exercise-repository-port';
import { ExercisePage } from './exercises/exercise-page';

type AppProps = {
  exerciseRepository?: ExerciseRepositoryPort;
};

export function App({ exerciseRepository: repository = exerciseRepository }: AppProps) {
  const [activeSection, setActiveSection] = useState<'home' | 'exercises'>('home');

  return (
    <main className="app-shell">
      <nav className="app-nav" aria-label="Основная навигация">
        <button type="button" onClick={() => setActiveSection('home')}>Главная</button>
        <button type="button" onClick={() => setActiveSection('exercises')}>Упражнения</button>
      </nav>
      {activeSection === 'home' ? <section className="welcome-card" aria-labelledby="app-title">
        <p className="eyebrow">Личный журнал</p>
        <h1 id="app-title">GymApp</h1>
        <p className="welcome-copy">Тренируйся. Записывай. Расти.</p>
        <button type="button">Начать тренировку</button>
      </section> : <ExercisePage repository={repository} />}
    </main>
  );
}

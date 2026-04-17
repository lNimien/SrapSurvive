import { RunHistoryCardDTO } from '../../../types/dto.types';
import { RunHistoryCard } from './RunHistoryCard';

interface RunHistoryListProps {
  history: RunHistoryCardDTO[];
}

export function RunHistoryList({ history }: RunHistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-700/50 bg-gray-900/20 rounded">
        <span className="text-4xl mb-4 opacity-50">📡</span>
        <p className="text-gray-400 font-mono text-center">
          Todavía no has completado ninguna expedición.
          <br /><span className="text-gray-500 font-bold block mt-2">¡Lanza tu primera expedición desde el puente de mando!</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {history.map((run) => (
        <RunHistoryCard key={run.id} run={run} />
      ))}
    </div>
  );
}

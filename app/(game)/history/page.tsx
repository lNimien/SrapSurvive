import { auth } from '../../../server/auth/auth';
import { redirect } from 'next/navigation';
import { ExtractionResultRepository } from '../../../server/repositories/extraction-result.repository';
import { RunHistoryList } from '../../../components/game/history/RunHistoryList';
import { PaginationControls } from '../../../components/game/history/PaginationControls';
import Link from 'next/link';

export const metadata = {
  title: 'Historial — Scrap & Survive',
};

// Update to Next.js 16 standard for async searchParams.
export default async function HistoryPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const resolvedParams = await props.searchParams;
  const pageParam = resolvedParams?.page;
  const page = pageParam && !Array.isArray(pageParam) ? parseInt(pageParam as string, 10) : 1;
  const validPage = isNaN(page) || page < 1 ? 1 : page;

  const result = await ExtractionResultRepository.getRunHistory(session.user.id, validPage, 10);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-end border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-sm text-gray-500 font-mono uppercase tracking-widest mb-1">
             Registro del Sistema
          </h1>
          <h2 className="text-3xl font-display font-bold text-gray-100 tracking-wider">
             HISTORIAL DE EXPEDICIONES
          </h2>
        </div>
        <Link 
           href="/dashboard" 
           className="text-gray-400 font-mono text-sm uppercase hover:text-gray-200 transition-colors border border-gray-700 px-4 py-2 rounded bg-gray-900/50"
        >
           [ Volver ]
        </Link>
      </header>

      <section className="flex-grow">
         <RunHistoryList history={result.data} />
      </section>

      {result.totalPages > 1 && (
         <PaginationControls currentPage={result.page} totalPages={result.totalPages} />
      )}
    </div>
  );
}

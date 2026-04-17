import { Skeleton } from '../../../components/ui/skeleton';

export default function HistoryLoading() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col pt-12 animate-in fade-in duration-500">
      
      {/* Headers */}
      <header className="mb-8 flex justify-between items-end border-b border-gray-800 pb-4">
         <div>
            <Skeleton className="h-4 w-32 mb-2 bg-gray-800" />
            <Skeleton className="h-10 w-80 bg-gray-800" />
         </div>
         <Skeleton className="h-10 w-24 bg-gray-800" />
      </header>

      <section className="flex-grow">
         <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((idx) => (
               <Skeleton key={idx} className="h-28 w-full bg-gray-900/50 rounded border border-gray-800" />
            ))}
         </div>
      </section>

      {/* Pagination Placeholder */}
      <div className="flex items-center justify-between border border-gray-800 bg-gray-900/50 p-2 rounded mt-6">
         <Skeleton className="h-8 w-24 bg-gray-800 rounded" />
         <Skeleton className="h-4 w-40 bg-gray-800" />
         <Skeleton className="h-8 w-24 bg-gray-800 rounded" />
      </div>

    </div>
  );
}

import { Skeleton } from '../../../components/ui/skeleton';

export default function InventoryLoading() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col pt-12 animate-in fade-in duration-500">
      
      {/* Headers */}
      <header className="mb-8 flex justify-between items-end border-b border-gray-800 pb-4">
         <div>
            <Skeleton className="h-4 w-24 mb-2 bg-gray-800" />
            <Skeleton className="h-10 w-56 bg-gray-800" />
         </div>
         <Skeleton className="h-10 w-24 bg-gray-800" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">

         {/* Equipment Slots */}
         <div>
            <Skeleton className="h-6 w-32 mb-6 bg-gray-800" />
            <div className="flex flex-col gap-3">
               {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <Skeleton key={idx} className="h-14 w-full bg-gray-800/80 rounded" />
               ))}
            </div>
         </div>

         {/* Inventory Grid */}
         <div>
            <Skeleton className="h-6 w-32 mb-6 bg-gray-800" />
            <div className="grid grid-cols-4 gap-2">
               {[...Array(16)].map((_, idx) => (
                  <Skeleton key={idx} className="h-20 w-full bg-gray-800/50 rounded" />
               ))}
            </div>
         </div>

      </div>
    </div>
  );
}

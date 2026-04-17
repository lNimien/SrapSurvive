import { Skeleton } from '../../../components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col pt-12 animate-in fade-in duration-500">
      
      {/* Profile Skeleton */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-10 w-64 bg-gray-800" />
          <Skeleton className="h-6 w-16 bg-gray-800" />
        </div>
        <Skeleton className="h-4 w-48 mb-6 bg-gray-800/80" />
        
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-8 w-1/3 bg-gray-800" />
          <Skeleton className="h-8 w-2/3 bg-gray-800" />
        </div>
        
        <Skeleton className="h-12 w-full bg-gray-800 mb-8" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
        
        {/* Run/Expedition Context Skeleton */}
        <div>
           <Skeleton className="h-6 w-48 mb-6 bg-gray-800" />
           <Skeleton className="h-64 w-full bg-gray-900/50 border border-gray-800 rounded" />
        </div>

        {/* Equipment Skeleton */}
        <div>
           <Skeleton className="h-6 w-32 mb-6 bg-gray-800" />
           <div className="bg-gray-900/50 border border-gray-800 p-6 rounded relative min-h-[300px] flex items-center justify-center">
              <Skeleton className="w-16 h-16 rounded-full bg-gray-800 absolute top-10" />
              <Skeleton className="w-16 h-16 rounded-full bg-gray-800 absolute bottom-10 left-10" />
              <Skeleton className="w-16 h-16 rounded-full bg-gray-800 absolute bottom-10 right-10" />
           </div>
        </div>

      </div>
    </div>
  );
}

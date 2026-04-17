'use client';

import { useRouter } from 'next/navigation';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
}

export function PaginationControls({ currentPage, totalPages }: PaginationControlsProps) {
  const router = useRouter();

  const handlePrev = () => {
    if (currentPage > 1) {
      router.push(`?page=${currentPage - 1}`);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      router.push(`?page=${currentPage + 1}`);
    }
  };

  if (totalPages <= 1) {
     return null; // Ocultar si solo hay una página
  }

  return (
    <div className="flex items-center justify-between border border-gray-800 bg-gray-900/50 p-2 rounded mt-6">
      <button
        onClick={handlePrev}
        disabled={currentPage <= 1}
        className="px-4 py-2 font-mono text-sm tracking-widest text-gray-400 disabled:opacity-30 hover:bg-gray-800 rounded transition-colors"
      >
        &lt; ANTERIOR
      </button>
      
      <span className="font-mono text-xs text-gray-500">
        PÁGINA {currentPage} DE {totalPages}
      </span>
      
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="px-4 py-2 font-mono text-sm tracking-widest text-gray-400 disabled:opacity-30 hover:bg-gray-800 rounded transition-colors"
      >
        SIGUIENTE &gt;
      </button>
    </div>
  );
}

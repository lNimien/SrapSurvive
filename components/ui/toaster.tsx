'use client';

import { useToast } from '../../hooks/use-toast';
import { X } from 'lucide-react';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto relative p-4 border shadow-lg animate-in slide-in-from-right-full duration-300 cyberpunk-box
            ${toast.variant === 'destructive' ? 'bg-destructive/90 border-destructive text-destructive-foreground' : 
              toast.variant === 'success' ? 'bg-green-900/90 border-green-500 text-green-100' :
              'glass-panel border-primary/50 text-foreground'}
          `}
        >
          {toast.title && <h4 className="font-bold font-sans uppercase tracking-widest text-sm">{toast.title}</h4>}
          {toast.description && <p className="text-xs font-mono mt-1 opacity-90">{toast.description}</p>}
        </div>
      ))}
    </div>
  );
}

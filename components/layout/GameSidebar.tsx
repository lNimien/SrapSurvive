import Link from 'next/link';
import { PackageSearch, Satellite, BarChart2, Store, LogOut, Terminal } from 'lucide-react';
import { auth, signOut } from '../../server/auth/auth';
import { Button } from '../ui/button';

export async function GameSidebar() {
  const session = await auth();

  return (
    <aside className="w-16 md:w-[280px] glass-panel border-r border-primary/20 flex flex-col h-screen overflow-y-auto relative z-50 shadow-[4px_0_24px_-10px_rgba(0,243,255,0.15)]">
      {/* Decorative Top Scanline */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      <div className="p-6 border-b border-white/5 flex items-center justify-center md:justify-start gap-3">
        <Terminal className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
        <div className="hidden md:flex flex-col">
          <span className="text-xl font-sans font-bold text-primary neon-text-cyan uppercase tracking-[0.2em] leading-none">
            S&S_HUB
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
            v0.9.4 // System Online
          </span>
        </div>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-3 px-4">
        <Button asChild variant="ghost" className="justify-start gap-4 h-12 w-full hover:bg-primary/10 hover:text-primary transition-all group relative overflow-hidden">
          <Link href="/dashboard">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
            <Satellite className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="hidden md:inline font-sans uppercase tracking-widest font-semibold flex-1 text-left">Puente de Mando</span>
          </Link>
        </Button>
        
        <Button asChild variant="ghost" className="justify-start gap-4 h-12 w-full hover:bg-green-500/10 hover:text-green-400 transition-all group relative overflow-hidden">
          <Link href="/inventory">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
            <PackageSearch className="w-5 h-5 text-muted-foreground group-hover:text-green-400 transition-colors" />
            <span className="hidden md:inline font-sans uppercase tracking-widest font-semibold flex-1 text-left">Almacén</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" className="justify-start gap-4 h-12 w-full hover:bg-yellow-500/10 hover:text-yellow-400 transition-all group relative overflow-hidden">
          <Link href="/market">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
            <Store className="w-5 h-5 text-muted-foreground group-hover:text-yellow-400 transition-colors" />
            <span className="hidden md:inline font-sans uppercase tracking-widest font-semibold flex-1 text-left">Mercado Negro</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" className="justify-start gap-4 h-12 w-full hover:bg-purple-500/10 hover:text-purple-400 transition-all group relative overflow-hidden">
          <Link href="/history">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
            <BarChart2 className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            <span className="hidden md:inline font-sans uppercase tracking-widest font-semibold flex-1 text-left">Caja Negra</span>
          </Link>
        </Button>
      </nav>

      {session?.user && (
        <div className="p-4 border-t border-white/5 bg-background/20 relative">
          {/* Decorative Bottom Scanline */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-destructive to-transparent opacity-20" />
          <form action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}>
            <Button variant="ghost" className="justify-start gap-4 h-10 w-full hover:bg-destructive/10 hover:text-destructive transition-all group">
              <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
              <span className="hidden md:inline font-mono text-sm uppercase tracking-wider flex-1 text-left">_Desconectar</span>
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
}

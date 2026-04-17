import { PlayerStateDTO } from '../../types/dto.types';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

interface ScrapperCardProps {
  player: Pick<PlayerStateDTO, 'displayName' | 'level' | 'currentXp' | 'xpToNextLevel'>;
}

export function ScrapperCard({ player }: ScrapperCardProps) {
  const { displayName, level, currentXp, xpToNextLevel } = player;
  const xpPercent = Math.min(100, Math.round((currentXp / xpToNextLevel) * 100));

  return (
    <Card className="glass-panel border-primary/20 cyberpunk-box relative overflow-hidden group">
      {/* Background Decorative Scanline */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      
      <CardContent className="p-5 flex items-start gap-4 relative z-10">
        {/* Avatar HUD Frame */}
        <div className="relative group/avatar">
          <div className="w-16 h-16 bg-background/80 border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.1)] relative overflow-hidden">
            <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]" aria-hidden="true">⚙️</span>
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary" />
          </div>
          <Badge className="absolute -bottom-2 -right-2 bg-primary text-background font-sans font-black px-2 py-0 hover:bg-primary">
            LVL_{level}
          </Badge>
        </div>

        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex justify-between items-end gap-2">
            <h2 className="font-sans font-black text-xl text-primary neon-text-cyan uppercase tracking-tighter truncate leading-none">
              {displayName}
            </h2>
          </div>

          {/* XP HUD bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              <span>Sync_XP_Link</span>
              <span className="text-primary">{xpPercent}%</span>
            </div>
            
            <Progress 
              value={xpPercent} 
              className="h-2 rounded-none bg-primary/10 border border-primary/20" 
              role="progressbar"
              aria-label="Experiencia del chatarrero"
            />
            
            <p className="text-[10px] font-mono text-muted-foreground text-right tracking-[0.2em]">
              [{currentXp.toLocaleString()} // {xpToNextLevel.toLocaleString()}]
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

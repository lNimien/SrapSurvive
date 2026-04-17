import { auth, signIn } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export const metadata = {
  title: 'Scrap & Survive — Acceso al Terminal',
  description: 'Progresión, riesgo y chatarra espacial. El loop definitivo de extracción.',
};

export default async function LandingPage() {
  const session = await auth();

  // If already logged in, redirect straight to dashboard
  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return (
    <main className="landing-shell">
      {/* HUD Background elements */}
      <div className="hud-grid" aria-hidden="true" />
      <div className="hud-vignette" aria-hidden="true" />
      
      <div className="landing-content">
        <header className="landing-header">
          <div className="system-status">
            <span className="status-dot animate-pulse" />
            <span className="status-text mono">SYSTEM: ONLINE / SECTOR: C-74</span>
          </div>
          
          <h1 className="landing-title">
            <span className="title-scrap">SCRAP</span>
            <span className="title-amp">&</span>
            <span className="title-survive">SURVIVE</span>
          </h1>
          
          <p className="landing-subtitle mono">
            [ IDLE EXTRACTION RPG / V0.1-MVP ]
          </p>
        </header>

        <section className="landing-actions">
          <div className="action-card">
            <p className="action-description">
              Establece conexión con tu unidad de chatarrero para iniciar la expedición. 
              El progreso se sincroniza con el terminal central.
            </p>
            
            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: '/dashboard' });
              }}
            >
              <button
                type="submit"
                id="btn-login"
                className="btn-primary-terminal"
                aria-label="Acceder con Google"
              >
                <span className="btn-glitch-layer" aria-hidden="true">ACCEDER AL TERMINAL</span>
                <span className="btn-content">ACCEDER AL TERMINAL</span>
              </button>
            </form>

            <div className="connection-info">
              <span className="mono text-[10px] text-[var(--text-muted)]">
                STABLE CONNECTION REQUIRED // BIOMETRIC AUTH VIA GOOGLE
              </span>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="footer-credits mono">
            &copy; 2026 SCRAP & SURVIVE OPERATIONS. ALL RIGHTS RESERVED.
          </div>
        </footer>
      </div>

      {/* Styled JSX for landing-specific animations (if globals.css is already heavy) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .landing-shell {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background-color: var(--bg-void);
        }

        .hud-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, #1e2e42 1px, transparent 1px),
            linear-gradient(to bottom, #1e2e42 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.1;
          pointer-events: none;
        }

        .hud-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, rgba(8, 11, 16, 0.8) 100%);
          pointer-events: none;
        }

        .landing-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--sp-12);
          width: 100%;
          max-width: 600px;
          padding: var(--sp-8);
        }

        .landing-header {
          text-align: center;
        }

        .system-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--sp-2);
          margin-bottom: var(--sp-4);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: var(--green-bright);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--green-bright);
        }

        .status-text {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.2em;
        }

        .landing-title {
          font-family: var(--font-display);
          font-size: 4rem;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
          margin-bottom: var(--sp-2);
          display: flex;
          flex-direction: column;
        }

        .title-scrap { color: var(--text-primary); }
        .title-amp { font-size: 2rem; color: var(--amber-base); margin: 0.2rem 0; }
        .title-survive { color: var(--amber-bright); text-shadow: 0 0 30px var(--amber-glow); }

        .landing-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 0.4em;
        }

        .action-card {
          background: var(--bg-deep);
          border: 1px solid var(--border-normal);
          padding: var(--sp-8);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: var(--sp-6);
          position: relative;
          overflow: hidden;
        }

        .action-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--amber-base);
        }

        .action-description {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
          text-align: center;
        }

        /* Glitchy Button */
        .btn-primary-terminal {
          width: 100%;
          position: relative;
          padding: var(--sp-4) var(--sp-8);
          background: var(--amber-base);
          border: none;
          color: var(--bg-void);
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.1s;
        }

        .btn-primary-terminal:hover {
          background: var(--amber-bright);
          transform: translateY(-2px);
        }

        .btn-primary-terminal:active {
          transform: translateY(0);
        }

        .connection-info {
          text-align: center;
        }

        .landing-footer {
          margin-top: auto;
        }

        .footer-credits {
          font-size: 9px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
        }

        @media (max-width: 480px) {
          .landing-title { font-size: 3rem; }
          .title-amp { font-size: 1.5rem; }
        }
      ` }} />
    </main>
  );
}

import { NextResponse } from 'next/server';
import { auth } from '../../../../server/auth/auth';
import { PlayerStateService } from '../../../../server/services/player-state.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No estás autenticado.' } },
        { status: 401 }
      );
    }

    const runState = await PlayerStateService.getRunState(userId);

    return NextResponse.json({ success: true, data: runState });
  } catch (error) {
    console.error('[API Route: GET /api/game/run-state] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Error al recuperar estado de expedición' } },
      { status: 500 }
    );
  }
}

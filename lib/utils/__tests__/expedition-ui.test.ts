import { describe, expect, it } from 'vitest';

import {
  getActivityLine,
  getExpeditionStateMeta,
  getExpeditionVisualState,
} from '@/lib/utils/expedition-ui';

describe('expedition ui helpers', () => {
  it('maps danger bands into stable/alert/critical states', () => {
    expect(getExpeditionVisualState(0.25, false)).toBe('stable');
    expect(getExpeditionVisualState(0.68, false)).toBe('alert');
    expect(getExpeditionVisualState(0.9, false)).toBe('critical');
    expect(getExpeditionVisualState(0.2, true)).toBe('critical');
  });

  it('rotates deterministic activity lines by tick', () => {
    const line0 = getActivityLine('stable', 0);
    const line1 = getActivityLine('stable', 1);

    expect(line0).not.toBe(line1);
    expect(getActivityLine('stable', 3)).toBe(line0);
  });

  it('returns consistent visual metadata for each expedition state', () => {
    expect(getExpeditionStateMeta('stable')).toMatchObject({
      label: 'Estable',
      badgeClass: expect.stringContaining('emerald'),
    });

    expect(getExpeditionStateMeta('alert')).toMatchObject({
      label: 'Alerta',
      progressClass: expect.stringContaining('amber'),
    });

    expect(getExpeditionStateMeta('critical')).toMatchObject({
      label: 'Crítico',
      guidance: expect.stringContaining('extracción inmediata'),
    });
  });
});

import 'server-only';

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function fromRoot(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

describe('game navigation pages structure', () => {
  it('keeps dashboard focused on command-bridge sections', async () => {
    const dashboardSource = await readFile(
      fromRoot('app', '(game)', 'dashboard', 'page.tsx'),
      'utf-8',
    );

    expect(dashboardSource).not.toContain('ContractsPanel');
    expect(dashboardSource).not.toContain('UpgradesPanel');
    expect(dashboardSource).not.toContain('AchievementsPanel');
    expect(dashboardSource).toContain('ExpeditionManager');
    expect(dashboardSource).toContain('ScrapperCard');
    expect(dashboardSource).toContain('EquipmentDisplay');
  });

  it('wires dedicated pages for contracts, upgrades and achievements', async () => {
    const contractsPage = await readFile(fromRoot('app', '(game)', 'contracts', 'page.tsx'), 'utf-8');
    const upgradesPage = await readFile(fromRoot('app', '(game)', 'upgrades', 'page.tsx'), 'utf-8');
    const achievementsPage = await readFile(fromRoot('app', '(game)', 'achievements', 'page.tsx'), 'utf-8');
    const sidebar = await readFile(fromRoot('components', 'layout', 'GameSidebar.tsx'), 'utf-8');

    expect(contractsPage).toContain('ContractsPanel');
    expect(upgradesPage).toContain('UpgradesPanel');
    expect(achievementsPage).toContain('AchievementsPanel');
    expect(sidebar).toContain('href="/contracts"');
    expect(sidebar).toContain('href="/upgrades"');
    expect(sidebar).toContain('href="/achievements"');
  });
});

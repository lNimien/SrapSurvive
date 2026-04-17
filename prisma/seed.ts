import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ITEM_CATALOG } from '../config/game.config';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Start seeding ItemDefinitions...');

  for (const item of ITEM_CATALOG) {
    await prisma.itemDefinition.upsert({
      where: { internalKey: item.id },
      update: {
        displayName: item.displayName,
        description: item.description,
        rarity: item.rarity as any,
        baseValue: item.baseValue,
        stackable: item.maxStack > 1,
        maxStack: item.maxStack,
        iconKey: item.iconKey,
        metadata: {
          itemType: item.itemType,
          equipmentSlot: item.equipmentSlot,
          configOptions: item.configOptions,
        },
      },
      create: {
        id: item.id,
        internalKey: item.id,
        displayName: item.displayName,
        description: item.description,
        rarity: item.rarity as any,
        baseValue: item.baseValue,
        stackable: item.maxStack > 1,
        maxStack: item.maxStack,
        iconKey: item.iconKey,
        metadata: {
          itemType: item.itemType,
          equipmentSlot: item.equipmentSlot,
          configOptions: item.configOptions,
        },
      },
    });
  }

  console.log(`✅ Seeded ${ITEM_CATALOG.length} items.`);

  // In the future, we can add ZoneDefinitions here too
  console.log('🏁 Seeding finished.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

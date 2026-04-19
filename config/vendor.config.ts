import { ID_EXTRACTION_INSURANCE } from './game.config';

export interface VendorItem {
  itemDefinitionId: string;
  priceCC: number;
}

/**
 * Catálogo de artículos disponibles para compra en el Mercado Negro.
 * Los precios están en Créditos de Chatarrero (CC).
 */
export const VENDOR_CATALOG: VendorItem[] = [
  {
    itemDefinitionId: 'scrap_metal',
    priceCC: 4,
  },
  {
    itemDefinitionId: 'energy_cell',
    priceCC: 10,
  },
  {
    itemDefinitionId: 'copper_wire',
    priceCC: 8,
  },
  {
    itemDefinitionId: 'synthetic_lubricant',
    priceCC: 12,
  },
  {
    itemDefinitionId: 'recycled_component',
    priceCC: 28,
  },
  {
    itemDefinitionId: 'armor_fiber',
    priceCC: 30,
  },
  {
    itemDefinitionId: 'corrupted_crystal',
    priceCC: 48,
  },
  {
    itemDefinitionId: 'optic_sensor',
    priceCC: 120,
  },
  {
    itemDefinitionId: 'alien_resin',
    priceCC: 140,
  },
  {
    itemDefinitionId: 'plasma_core',
    priceCC: 320,
  },
  {
    itemDefinitionId: 'quantum_filament',
    priceCC: 360,
  },
  {
    itemDefinitionId: 'void_alloy',
    priceCC: 760,
  },
  {
    itemDefinitionId: 'basic_work_helmet',
    priceCC: 45,
  },
  {
    itemDefinitionId: 'basic_work_suit',
    priceCC: 60,
  },
  {
    itemDefinitionId: 'industrial_work_gloves',
    priceCC: 38,
  },
  {
    itemDefinitionId: ID_EXTRACTION_INSURANCE,
    priceCC: 95,
  },
  {
    itemDefinitionId: "reinforced_helmet",
    priceCC: 180,
  },
  {
    itemDefinitionId: "light_armor_suit",
    priceCC: 260,
  },
  {
    itemDefinitionId: 'portable_thermal_cutter',
    priceCC: 320,
  },
  {
    itemDefinitionId: "extended_cargo_backpack",
    priceCC: 290,
  }
];

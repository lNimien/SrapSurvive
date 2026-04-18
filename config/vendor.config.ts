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
    itemDefinitionId: ID_EXTRACTION_INSURANCE,
    priceCC: 250,
  },
  {
    itemDefinitionId: "reinforced_helmet",
    priceCC: 500,
  },
  {
    itemDefinitionId: "light_armor_suit",
    priceCC: 850,
  },
  {
    itemDefinitionId: "extended_cargo_backpack",
    priceCC: 1200,
  }
];

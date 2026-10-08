import type { EquipmentSpecInput } from '../spec/schema';
import ldB004 from './LD-B004.json';
import ldA002 from './LD-A002.json';

/** Specs escritos à mão (Fase 1). */
export const HANDWRITTEN_SPECS: EquipmentSpecInput[] = [
  ldB004 as EquipmentSpecInput,
  ldA002 as EquipmentSpecInput,
];

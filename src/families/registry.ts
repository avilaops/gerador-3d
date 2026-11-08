import type { FamilyId } from '../spec/schema';
import type { AnyFamilyDefinition } from './types';
import { selectorizedTower } from './selectorizedTower';
import { plateLoadedLever } from './plateLoadedLever';
import { bench } from './bench';
import { rack } from './rack';
import { cableStation } from './cableStation';
import { legPress } from './legPress';
import { seal } from './seal';

const FAMILIES: Partial<Record<FamilyId, AnyFamilyDefinition>> = {
  'selectorized-tower': selectorizedTower,
  'plate-loaded-lever': plateLoadedLever,
  bench,
  rack,
  'cable-station': cableStation,
  'leg-press': legPress,
  seal,
};

export function getFamily(id: FamilyId): AnyFamilyDefinition | undefined {
  return FAMILIES[id];
}

/** Famílias com gerador implementado. As demais existem no schema, mas ainda não geram modelo. */
export function implementedFamilies(): FamilyId[] {
  return Object.keys(FAMILIES) as FamilyId[];
}

import type { UnitSystem } from './types';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;

export function displayWeight(kg: number, units: UnitSystem, digits = 1): string {
  const v = units === 'imperial' ? kgToLb(kg) : kg;
  return `${v.toFixed(digits)} ${units === 'imperial' ? 'lb' : 'kg'}`;
}

export function weightUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'lb' : 'kg';
}

export function toKg(value: number, units: UnitSystem): number {
  return units === 'imperial' ? lbToKg(value) : value;
}

export function fromKg(kg: number, units: UnitSystem): number {
  return units === 'imperial' ? kgToLb(kg) : kg;
}

import type { Food } from './types';

/**
 * Hands a Food object from one screen to the next without squeezing it into
 * URL params. Lives for the app session only.
 */
const cache = new Map<string, Food>();

export function putFood(food: Food): string {
  cache.set(food.id, food);
  return food.id;
}

export function getFood(id: string): Food | undefined {
  return cache.get(id);
}

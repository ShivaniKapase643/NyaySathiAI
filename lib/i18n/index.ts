/**
 * i18n index — exports all UI string sets and the getStrings helper.
 */
import { en } from "./en";
import { hi } from "./hi";
import { mr } from "./mr";

export type SupportedLocale = "en" | "hi" | "mr";

export const strings = { en, hi, mr } as const;

export function getStrings(locale: SupportedLocale) {
  return strings[locale] ?? strings.en;
}

export { en, hi, mr };
export type { UIStrings } from "./en";

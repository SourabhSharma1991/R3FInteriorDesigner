import japandi from '../data/themes/japandi.json'
import modernWarm from '../data/themes/modern-warm.json'
import scandinavian from '../data/themes/scandinavian.json'
import type { Theme } from '../types/theme'
import { parseTheme } from './ThemeLoader'

/** Themes bundled with the app. Validated at module load, like the sample graph. */
export const BUILTIN_THEMES: Theme[] = [modernWarm, scandinavian, japandi].map(parseTheme)

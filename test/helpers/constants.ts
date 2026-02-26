import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, '../fixtures')
export const DEMOTILES_Z2 = path.join(FIXTURES_DIR, 'demotiles-z2.smp')
export const OSM_BRIGHT_Z6 = path.join(FIXTURES_DIR, 'osm-bright-z6.smp')
export const ONLINE_STYLE_URL = 'https://demotiles.maplibre.org/style.json'

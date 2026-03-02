// Items that have a local cropped icon
const LOCAL_ICONS = new Set([
  // minerais
  'fer', 'cuivre', 'bronze', 'kobalte', 'manganese', 'etain', 'argent',
  'bauxite', 'or', 'dolomite', 'cendrepierre', 'silicate', 'obsidienne', 'charbon',
  'cristal-pliable', 'cristal-liquide', 'ecume-de-mer',
  // alliages
  'ferrite', 'aluminite', 'ebonite', 'magnesite', 'bakelelite', 'kouartz',
  'plaque', 'kriptonite', 'kobalite', 'rutile', 'pyrute', 'ardonite',
])

export function getItemIcon(id) {
  if (LOCAL_ICONS.has(id)) return `/icons/${id}.png`
  return null
}

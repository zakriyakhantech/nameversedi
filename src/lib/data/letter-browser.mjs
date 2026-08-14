export const ALL_RELIGIONS = ['islamic', 'christian', 'hindu', 'italian'];
export const ALL_LETTERS = [...'abcdefghijklmnopqrstuvwxyz', '#'];

export function lettersFor(religionKey, manifest) {
  const available = new Set();
  for (const item of manifest[religionKey] || []) {
    if (!item.name) continue;
    const firstChar = item.name.trim().charAt(0).toLowerCase();
    available.add(/^[a-z]$/.test(firstChar) ? firstChar : '#');
  }
  return available;
}

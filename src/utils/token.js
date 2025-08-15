export function cleanToken(raw) {
  if (!raw) return '';
  return String(raw).replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
}

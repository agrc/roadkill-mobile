export function coordStringToWKT(coordString) {
  if (!coordString) return null;

  return `SRID=4326;POINT(${coordString})`;
}

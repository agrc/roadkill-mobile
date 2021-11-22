export async function getConstants(db) {
  return {
    species: await db('species'),
  };
}

export async function getConstants(db) {
  return {
    species: await db('species'),
    organizations: await db('organizations'),
  };
}

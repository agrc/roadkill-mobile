exports.getConstants = async function (db) {
  return {
    species: await db('species'),
    organizations: await db('organizations'),
  };
};

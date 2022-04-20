function getKey(table, foreignKey) {
  return `${table}_${foreignKey}_fkey`;
}

function addCascadingDelete(knex, childTable, foreignKey, primaryKey, parentTable) {
  return knex.schema.alterTable(childTable, (table) => {
    const key = getKey(childTable, foreignKey);
    table.dropForeign(foreignKey, key);
    table.foreign(foreignKey, key).references(primaryKey).inTable(parentTable).onDelete('CASCADE');
  });
}

function removeCascadingDelete(knex, childTable, foreignKey, primaryKey, parentTable) {
  return knex.schema.alterTable(childTable, (table) => {
    const key = getKey(childTable, foreignKey);
    table.dropForeign(foreignKey, key);
    table.foreign(foreignKey, key).references(primaryKey).inTable(parentTable);
  });
}

const INFOS = [
  ['users_have_notification_areas', 'user_id', 'id', 'users'],
  ['users_have_notification_areas', 'area_id', 'id', 'notification_areas'],
  ['routes', 'user_id', 'id', 'users'],
  ['report_infos', 'user_id', 'id', 'users'],
  ['public_reports', 'report_id', 'report_id', 'report_infos'],
  ['pickup_reports', 'report_id', 'report_id', 'report_infos'],
  ['pickup_reports', 'route_id', 'route_id', 'routes'],
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return Promise.all(INFOS.map((info) => addCascadingDelete(knex, ...info)));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return Promise.all(INFOS.map((info) => removeCascadingDelete(knex, ...info)));
};

import sqlite3 from 'sqlite3';
import { identify } from 'sql-query-identifier';

import createDebug from '../../debug';

const debug = createDebug('db:clients:sqlite');

const sqliteErrors = {
  CANCELED: 'SQLITE_INTERRUPT',
};


export default async function (server, database) {
  const dbConfig = configDatabase(server, database);
  debug('create driver client for sqlite3 with config %j', dbConfig);

  sqlite3.verbose();

  const conn = { dbConfig };

  // light solution to test connection with with the server
  await driverExecuteQuery(conn, { query: 'SELECT sqlite_version()' });

  return {
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: () => listTables(conn),
    listViews: () => listViews(conn),
    listRoutines: () => listRoutines(conn),
    listTableColumns: (db, table) => listTableColumns(conn, db, table),
    listTableTriggers: (table) => listTableTriggers(conn, table),
    listTableIndexes: (db, table) => listTableIndexes(conn, db, table),
    listSchemas: () => listSchemas(conn),
    getTableReferences: (table) => getTableReferences(conn, table),
    getTableKeys: (db, table) => getTableKeys(conn, db, table),
    query: (queryText) => query(conn, queryText),
    executeQuery: (queryText) => executeQuery(conn, queryText),
    listDatabases: () => listDatabases(conn),
    getQuerySelectTop: (table, limit) => getQuerySelectTop(conn, table, limit),
    getTableCreateScript: (table) => getTableCreateScript(conn, table),
    getViewCreateScript: (view) => getViewCreateScript(conn, view),
    getRoutineCreateScript: (routine) => getRoutineCreateScript(conn, routine),
    truncateAllTables: () => truncateAllTables(conn),
  };
}


export function disconnect(conn) {
  console.log('--->conn', conn);
  // const connection = await new Connection(conn.dbConfig);
  // connection.close();
}


export function wrapIdentifier(value) {
  return (value !== '*' ? `[${value.replace(/\[/g, '[')}]` : '*');
}


export function getQuerySelectTop(client, table, limit) {
  return `SELECT TOP ${limit} * FROM ${wrapIdentifier(table)}`;
}

export function query(conn, queryText, sleepTime) {
  let queryConnection = null;

  return {
    execute() {
      return runWithConnection(conn, async (connection) => {
        try {
          queryConnection = connection;

          if (sleepTime) { await wait(sleepTime); }

          const results = await runAllQuery(connection, { query: queryText });

          const commands = identifyCommands(queryText);

          return results.map((_, idx) => parseRowQueryResult(results[idx], commands[idx]));
        } catch (err) {
          if (err.code === sqliteErrors.CANCELED) {
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          throw err;
        }
      });
    },

    async cancel() {
      if (!queryConnection) {
        throw new Error('Query not ready to be canceled');
      }

      queryConnection.interrupt();
    },
  };
}


export async function executeQuery(conn, queryText) {
  const { request, data } = await driverExecuteQuery(conn, { query: queryText, multiple: true });

  const commands = identifyCommands(queryText);

  // Executing only non select queries will not return results.
  // So we "fake" there is at least one result.
  const results = !data.length && request.rowsAffected ? [[]] : data;

  return results.map((_, idx) => parseRowQueryResult(results[idx], request, commands[idx]));
}


export async function listTables(conn) {
  const sql = `
    SELECT name
    FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row.name);
}

export async function listViews(conn) {
  const sql = `
    SELECT name
    FROM sqlite_master
    WHERE type = 'view'
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row.name);
}

export function listRoutines() {
  return []; // DOES NOT SUPPORT IT
}

export async function listTableColumns(conn, database, table) {
  const sql = `PRAGMA table_info('${table}')`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => ({
    columnName: row.name,
    dataType: row.type,
  }));
}

export async function listTableTriggers(conn, table) {
  const sql = `
    SELECT name
    FROM sqlite_master
    WHERE type = 'trigger'
      AND tbl_name = '${table}'
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row.name);
}

export async function listTableIndexes(conn, database, table) {
  const sql = `PRAGMA INDEX_LIST('${table}')`;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row.name);
}

export function listSchemas() {
  return []; // DOES NOT SUPPORT IT
}

export async function listDatabases(conn) {
  const { data } = await driverExecuteQuery(conn, { query: 'PRAGMA database_list;' });

  return data.map((row) => row.file);
}

export function getTableReferences() {
  return []; // TODO: not implemented yet
}

export function getTableKeys() {
  return []; // TODO: not implemented yet
}

export async function getTableCreateScript(conn, table) {
  const sql = `
    SELECT sql
    FROM sqlite_master
    WHERE name = '${table}';
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row.sql);
}

export async function getViewCreateScript(conn, view) {
  const sql = `
    SELECT sql
    FROM sqlite_master
    WHERE name = '${view}';
  `;

  const { data } = await driverExecuteQuery(conn, { query: sql });

  return data.map((row) => row.sql);
}

export function getRoutineCreateScript() {
  return []; // DOES NOT SUPPORT IT
}

export async function truncateAllTables(conn) {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection };

    const tables = await listTables(connClient);

    const truncateAll = tables.map((table) => `
      delete from ${table};
      delete from sqlite_sequence where name='${table}';
    `).join('');

    await driverExecuteQuery(connClient, { query: truncateAll });
  });
}


function configDatabase(server, database) {
  const config = {
    // user: server.config.user,
    // password: server.config.password,
    // server: server.config.host,
    database: database.database,
    // port: server.config.port,
    // requestTimeout: Infinity,
    // appName: server.config.applicationName || 'sqlectron',
    // domain: server.config.domain,
    // pool: {
    //   max: 5,
    // },
    // options: {
    //   encrypt: server.config.ssl,
    // },
  };

  if (server.sshTunnel) {
    config.server = server.config.localHost;
    config.port = server.config.localPort;
  }

  return config;
}


function parseRowQueryResult(data, request, command) {
  // Fallback in case the identifier could not reconize the command
  const isSelect = !!(data.length || !request.rowsAffected);

  return {
    command: command || (isSelect && 'SELECT'),
    rows: data,
    fields: Object.keys(data[0] || {}).map((name) => ({ name })),
    rowCount: data.length,
    affectedRows: request.rowsAffected,
  };
}


function identifyCommands(queryText) {
  try {
    return identify(queryText);
  } catch (err) {
    return [];
  }
}

export function driverExecuteQuery(conn, queryArgs) {
  const runQuery = (connection) => new Promise((resolve, reject) => {
    connection.all(queryArgs.query, queryArgs.params, (err, data) => {
      console.log('--->driverExecuteQuery err', err);
      console.log('--->driverExecuteQuery result', data);
      if (err) { return reject(err); }
      return resolve({ data });
    });
    // if (queryArgs.multiple) {
    //   request.multiple = true;
    // }

    // return {
    //   request,
    //   data: await request.query(queryArgs.query),
    // };
  });

  return conn.connection
    ? runQuery(conn.connection)
    : runWithConnection(conn, runQuery);
}

function runWithConnection(conn, run) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(conn.dbConfig.database, (err) => {
      if (err) { return reject(err); }

      db.serialize();

      return resolve(run(db));
    });
  });
}

const runAllQuery = (connection, queryArgs) => new Promise((resolve, reject) => {
  connection.all(queryArgs.query, queryArgs.params, (err, data) => {
    console.log('--->driverExecuteQuery err', err);
    console.log('--->driverExecuteQuery result', data);
    if (err) { return reject(err); }
    return resolve({ data });
  });
});

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));

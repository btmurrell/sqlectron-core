# sqlectron-core

[![Build status](https://ci.appveyor.com/api/projects/status/bdnpb06lu4sl0hwn/branch/master?svg=true)](https://ci.appveyor.com/project/maxcnunes/sqlectron-core/branch/master)

The common code used by all sqlectron clients.

> Requires node 6 or higher.

#### How to pronounce

It is pronounced "sequelectron" - https://translate.google.com/?source=osdd#en/en/sequelectron

#### Current supported databases
* [PostgreSQL](http://www.postgresql.org/)
* [MySQL](https://www.mysql.com/)
* [Microsoft SQL Server](http://www.microsoft.com/en-us/server-cloud/products/sql-server/)
* [Cassandra](http://cassandra.apache.org/) (NoSQL; [Exceptions about this client](https://github.com/sqlectron/sqlectron-core/releases/tag/v6.3.0))

Do you want to support another SQL database? It is expected that in the pull request the new database is included in the [db.spec.js](https://github.com/sqlectron/sqlectron-core/blob/master/spec/db.spec.js).

## Installation

Install via npm:

```bash
$ npm install sqlectron-core
```

## Configuration

SQLECTRON keeps a hidden configuration file called `.sqlectron.json` at the user's home directory (`~/` osx and linux; `%userprofile%` windows ).

Although you can change this file manually, most of time you should not worry about it because SQLECTRON will manage the configuration for you.

**Example**

```json
{
  "resultItemsPerPage": 50,
  "limitQueryDefaultSelectTop": 100,
  "servers": [
    {
      "id": "c48890d8-5d87-4085-8b22-94981f8d522c",
      "name": "pg-vm-ssh",
      "client": "postgresql",
      "host": "localhost",
      "port": 5432,
      "user": "user",
      "password": "password",
      "database": "company",
      "ssh": {
        "host": "10.10.10.10",
        "port": 22,
        "privateKey": "~/.vagrant.d/insecure_private_key",
        "user": "core"
      }
    },
    {
      "id": "0f6536a1-c232-4515-942a-c0fb56d362b2",
      "name": "vm-ssh",
      "client": "mysql",
      "host": "localhost",
      "port": 3306,
      "user": "root",
      "password": "password",
      "database": "authentication"
    }
  ]
}
```

### Fields

#### resultItemsPerPage

The limit of items per page *`(default on sqlectron-gui: 100)`*
The paging is not done in SQL query. Instead its is done during the results rendering.

#### limitQueryDefaultSelectTop

The limit used in the default query *`(default: 1000)`*

#### servers

Array with all servers connection.

- `id`: in case including a new server manually there is no need setting an id field because SQLECTRON will do it for you
- `name`
- `client`: `postgresql`, `mysql` or `sqlserver`
- `host`
- `port`
- `user`
- `password`
- `database`
- `ssh`
  - `host`
  - `user`
  - `port`
  - `privateKey`
  - `privateKeyWithPassphrase`



## Contributing

It is required to use [editorconfig](http://editorconfig.org/). Furthermore, please write and run tests (`/spec/db.spec.js`) before pushing any changes.

### with docker + docker-compose

It will bring up a MySQL and PostgreSQL database and run all the tests:

```shell
docker-compose run --rm test
```

### "manually"

You will need to bring up all the databases then run the tests through:

```js
npm test
```

## License

Copyright (c) 2015 The SQLECTRON Team. This software is licensed under the [MIT License](http://raw.github.com/sqlectron/sqlectron-core/master/LICENSE).

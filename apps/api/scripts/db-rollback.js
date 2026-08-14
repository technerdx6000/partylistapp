const path = require("node:path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

const databaseHost = process.env.DB_HOST === "db" ? "127.0.0.1" : process.env.DB_HOST;

async function runRollback() {
  const connection = await mysql.createConnection({
    host: databaseHost,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS required_items;
      DROP TABLE IF EXISTS items;
      DROP TABLE IF EXISTS people;
      DROP TABLE IF EXISTS categories;
      SET FOREIGN_KEY_CHECKS = 1;
    `);

    console.log(`Rolled back current schema from ${process.env.DB_NAME}`);
  } finally {
    await connection.end();
  }
}

runRollback().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
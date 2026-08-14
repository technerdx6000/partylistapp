const fs = require("node:fs/promises");
const path = require("node:path");

const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

const databaseHost = process.env.DB_HOST === "db" ? "127.0.0.1" : process.env.DB_HOST;

async function runMigration() {
  const connection = await mysql.createConnection({
    host: databaseHost,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const schemaPath = path.resolve(__dirname, "..", "setup-atlasdb.sql");
    const requiredItemsPath = path.resolve(
      __dirname,
      "..",
      "add-required-items.sql"
    );

    const schemaSql = await fs.readFile(schemaPath, "utf8");
    const requiredItemsSql = await fs.readFile(requiredItemsPath, "utf8");

    await connection.query(schemaSql);
    await connection.query(requiredItemsSql);

    console.log(`Applied current schema to ${process.env.DB_NAME}`);
  } finally {
    await connection.end();
  }
}

runMigration().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
const mysql = require("mysql2/promise");
require("dotenv").config();

async function testConnection() {
  try {
    console.log("Testing database connection...");
    console.log("Host:", process.env.DB_HOST);
    console.log("Port:", process.env.DB_PORT);
    console.log("User:", process.env.DB_USER);
    console.log("Database:", process.env.DB_NAME);

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log("✅ Database connection successful!");

    // Test if tables exist
    const [tables] = await connection.execute("SHOW TABLES");
    console.log("📋 Tables in database:", tables);

    await connection.end();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Error code:", error.code);
  }
}

testConnection();

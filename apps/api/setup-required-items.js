const mysql = require("mysql2/promise");
require("dotenv").config();

async function addRequiredItemsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Connected to database");

    // Create required_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS required_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_id INT NOT NULL,
        person_id INT NULL,
        is_fulfilled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
      )
    `);
    console.log("Required items table created successfully");

    // Insert sample data
    const [categories] = await connection.execute(
      "SELECT id FROM categories WHERE name = ? LIMIT 1",
      ["Food"]
    );
    const foodCategoryId = categories[0]?.id;

    if (foodCategoryId) {
      await connection.execute(
        `
        INSERT IGNORE INTO required_items (name, category_id, person_id, is_fulfilled) VALUES
        (?, ?, NULL, FALSE),
        (?, ?, 1, TRUE),
        (?, ?, NULL, FALSE),
        (?, ?, 2, TRUE),
        (?, ?, NULL, FALSE)
      `,
        [
          "Main Course",
          foodCategoryId,
          "Appetizers",
          foodCategoryId,
          "Dessert",
          foodCategoryId,
          "Beverages",
          foodCategoryId,
          "Paper Plates",
          foodCategoryId,
        ]
      );
      console.log("Sample required items inserted");
    }

    // Test the table
    const [rows] = await connection.execute("SELECT * FROM required_items");
    console.log("Required items table contents:", rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

addRequiredItemsTable();

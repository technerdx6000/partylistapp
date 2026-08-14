const pool = require("./config/database");

async function testRequiredItems() {
  try {
    console.log("Testing required items query...");

    const [rows] = await pool.execute(`
      SELECT ri.*, c.name as category_name, p.name as person_name 
      FROM required_items ri
      LEFT JOIN categories c ON ri.category_id = c.id
      LEFT JOIN people p ON ri.person_id = p.id
      ORDER BY ri.created_at DESC
    `);

    console.log("Required items found:", rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

testRequiredItems();

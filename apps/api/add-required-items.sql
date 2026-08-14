-- Docker init creates and selects the database named by DB_NAME.

-- Required Items table
CREATE TABLE IF NOT EXISTS required_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    person_id INT NULL,  -- NULL means unassigned
    is_fulfilled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
);

-- Insert some sample required items
INSERT IGNORE INTO required_items (name, category_id, person_id, is_fulfilled) VALUES
    ('Main Course', (SELECT id FROM categories WHERE name = 'Food' LIMIT 1), NULL, FALSE),
    ('Appetizers', (SELECT id FROM categories WHERE name = 'Food' LIMIT 1), 1, TRUE),
    ('Dessert', (SELECT id FROM categories WHERE name = 'Food' LIMIT 1), NULL, FALSE),
    ('Beverages', (SELECT id FROM categories WHERE name = 'Food' LIMIT 1), 2, TRUE),
    ('Paper Plates', (SELECT id FROM categories WHERE name = 'Food' LIMIT 1), NULL, FALSE);

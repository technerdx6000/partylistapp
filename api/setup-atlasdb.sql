-- Use your existing atlasdb database
USE atlasdb;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(10) DEFAULT '📦',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- People table
CREATE TABLE IF NOT EXISTS people (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    person_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

-- Insert default data (only if tables are empty)
INSERT IGNORE INTO categories (name, icon) VALUES ('Food', '🍽️');

INSERT IGNORE INTO people (name) VALUES 
    ('Alice Johnson'),
    ('Bob Smith'),
    ('Carol Davis'),
    ('David Wilson'),
    ('Emma Brown');

-- Get the category ID for food
SET @food_category_id = (SELECT id FROM categories WHERE name = 'Food' LIMIT 1);

-- Insert items (only if items table is empty)
INSERT IGNORE INTO items (name, category_id, person_id) VALUES
    ('Pizza', @food_category_id, 1),
    ('Salad', @food_category_id, 1),
    ('Burgers', @food_category_id, 2),
    ('Drinks', @food_category_id, 2),
    ('Cake', @food_category_id, 3),
    ('Ice Cream', @food_category_id, 4),
    ('Sandwiches', @food_category_id, 5);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_person_id ON items(person_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);

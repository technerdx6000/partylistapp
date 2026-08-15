CREATE TABLE IF NOT EXISTS event_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  name VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  quantity_required INT UNSIGNED NULL,
  status ENUM('open', 'covered', 'completed') NOT NULL DEFAULT 'open',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_event_items_event_id (event_id),
  KEY idx_event_items_category_id (category_id),
  CONSTRAINT fk_event_items_event_id
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_items_category_id
    FOREIGN KEY (category_id) REFERENCES event_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_event_items_created_by
    FOREIGN KEY (created_by) REFERENCES event_participants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_item_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT UNSIGNED NOT NULL,
  participant_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  note VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_item_assignments_item_participant (item_id, participant_id),
  KEY idx_event_item_assignments_item_id (item_id),
  CONSTRAINT chk_event_item_assignments_quantity CHECK (quantity >= 1),
  CONSTRAINT fk_event_item_assignments_item_id
    FOREIGN KEY (item_id) REFERENCES event_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_item_assignments_participant_id
    FOREIGN KEY (participant_id) REFERENCES event_participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
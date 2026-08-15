SET @has_legacy_data = (
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM people LIMIT 1)
      OR EXISTS (SELECT 1 FROM categories LIMIT 1)
      OR EXISTS (SELECT 1 FROM items LIMIT 1)
      OR EXISTS (SELECT 1 FROM required_items LIMIT 1)
    THEN 1
    ELSE 0
  END
);

INSERT INTO events (name, description, share_token, admin_token)
SELECT 'Imported Party', 'Imported from legacy PartyList data', '{{IMPORT_SHARE_TOKEN}}', '{{IMPORT_ADMIN_TOKEN}}'
FROM DUAL
WHERE @has_legacy_data = 1
  AND NOT EXISTS (
    SELECT 1
    FROM events
    WHERE description = 'Imported from legacy PartyList data' COLLATE utf8mb4_unicode_ci
  );

SET @import_event_id = (
  SELECT id
  FROM events
  WHERE description = 'Imported from legacy PartyList data' COLLATE utf8mb4_unicode_ci
  LIMIT 1
);

INSERT INTO event_participants (event_id, name, created_at)
SELECT @import_event_id, p.name, p.created_at
FROM people p
LEFT JOIN event_participants ep
  ON ep.event_id = @import_event_id
 AND ep.name = p.name COLLATE utf8mb4_unicode_ci
WHERE @import_event_id IS NOT NULL
  AND ep.id IS NULL;

INSERT INTO event_categories (event_id, name, icon, sort_order, created_at)
SELECT @import_event_id, c.name, c.icon, c.id - 1, c.created_at
FROM categories c
LEFT JOIN event_categories ec
  ON ec.event_id = @import_event_id
 AND ec.name = c.name COLLATE utf8mb4_unicode_ci
WHERE @import_event_id IS NOT NULL
  AND ec.id IS NULL;

INSERT INTO event_items (
  event_id,
  category_id,
  name,
  description,
  quantity_required,
  status,
  created_by,
  created_at,
  updated_at
)
SELECT
  @import_event_id,
  ec.id,
  i.name,
  NULL,
  NULL,
  'open',
  ep.id,
  i.created_at,
  i.updated_at
FROM items i
JOIN people p
  ON p.id = i.person_id
LEFT JOIN categories c
  ON c.id = i.category_id
LEFT JOIN event_categories ec
  ON ec.event_id = @import_event_id
 AND ec.name = c.name COLLATE utf8mb4_unicode_ci
LEFT JOIN event_participants ep
  ON ep.event_id = @import_event_id
 AND ep.name = p.name COLLATE utf8mb4_unicode_ci
LEFT JOIN event_items ei
  ON ei.event_id = @import_event_id
 AND ei.name = i.name COLLATE utf8mb4_unicode_ci
 AND ei.created_at = i.created_at
 AND ei.quantity_required IS NULL
WHERE @import_event_id IS NOT NULL
  AND ei.id IS NULL;

INSERT INTO event_item_assignments (item_id, participant_id, quantity, created_at)
SELECT ei.id, ep.id, 1, i.created_at
FROM items i
JOIN people p
  ON p.id = i.person_id
JOIN event_participants ep
  ON ep.event_id = @import_event_id
 AND ep.name = p.name COLLATE utf8mb4_unicode_ci
JOIN event_items ei
  ON ei.event_id = @import_event_id
 AND ei.name = i.name COLLATE utf8mb4_unicode_ci
 AND ei.created_at = i.created_at
 AND ei.quantity_required IS NULL
LEFT JOIN event_item_assignments eia
  ON eia.item_id = ei.id
 AND eia.participant_id = ep.id
WHERE @import_event_id IS NOT NULL
  AND eia.id IS NULL;

INSERT INTO event_items (
  event_id,
  category_id,
  name,
  description,
  quantity_required,
  status,
  created_by,
  created_at,
  updated_at
)
SELECT
  @import_event_id,
  ec.id,
  ri.name,
  NULL,
  1,
  'open',
  NULL,
  ri.created_at,
  ri.updated_at
FROM required_items ri
LEFT JOIN categories c
  ON c.id = ri.category_id
LEFT JOIN event_categories ec
  ON ec.event_id = @import_event_id
 AND ec.name = c.name COLLATE utf8mb4_unicode_ci
LEFT JOIN event_items ei
  ON ei.event_id = @import_event_id
 AND ei.name = ri.name COLLATE utf8mb4_unicode_ci
 AND ei.created_at = ri.created_at
 AND ei.quantity_required = 1
WHERE @import_event_id IS NOT NULL
  AND ei.id IS NULL;

INSERT INTO event_item_assignments (item_id, participant_id, quantity, created_at)
SELECT ei.id, ep.id, 1, ri.created_at
FROM required_items ri
JOIN people p
  ON p.id = ri.person_id
JOIN event_participants ep
  ON ep.event_id = @import_event_id
 AND ep.name = p.name COLLATE utf8mb4_unicode_ci
JOIN event_items ei
  ON ei.event_id = @import_event_id
 AND ei.name = ri.name COLLATE utf8mb4_unicode_ci
 AND ei.created_at = ri.created_at
 AND ei.quantity_required = 1
LEFT JOIN event_item_assignments eia
  ON eia.item_id = ei.id
 AND eia.participant_id = ep.id
WHERE @import_event_id IS NOT NULL
  AND ri.person_id IS NOT NULL
  AND eia.id IS NULL;
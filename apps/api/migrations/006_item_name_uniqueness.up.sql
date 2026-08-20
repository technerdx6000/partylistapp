UPDATE event_item_assignments assignment_row
JOIN event_items duplicate_item ON duplicate_item.id = assignment_row.item_id
JOIN (
  SELECT
    event_id,
    LOWER(TRIM(name)) AS normalized_name,
    MIN(id) AS keeper_id
  FROM event_items
  GROUP BY event_id, LOWER(TRIM(name))
  HAVING COUNT(*) > 1
) duplicate_group
  ON duplicate_group.event_id = duplicate_item.event_id
 AND duplicate_group.normalized_name = LOWER(TRIM(duplicate_item.name))
SET assignment_row.item_id = duplicate_group.keeper_id
WHERE duplicate_item.id <> duplicate_group.keeper_id;

UPDATE event_items target_item
JOIN (
  SELECT
    keeper.id AS keeper_id,
    keeper.event_id,
    LOWER(TRIM(keeper.name)) AS normalized_name,
    SUM(COALESCE(duplicate_item.quantity_required, 0)) AS merged_quantity_required
  FROM event_items keeper
  JOIN event_items duplicate_item
    ON duplicate_item.event_id = keeper.event_id
   AND LOWER(TRIM(duplicate_item.name)) = LOWER(TRIM(keeper.name))
  WHERE keeper.id = (
    SELECT MIN(candidate.id)
    FROM event_items candidate
    WHERE candidate.event_id = keeper.event_id
      AND LOWER(TRIM(candidate.name)) = LOWER(TRIM(keeper.name))
  )
  GROUP BY keeper.id, keeper.event_id, LOWER(TRIM(keeper.name))
  HAVING COUNT(*) > 1
) merged_group ON merged_group.keeper_id = target_item.id
SET target_item.quantity_required = CASE
  WHEN target_item.quantity_required IS NULL THEN NULL
  ELSE merged_group.merged_quantity_required
END;

DELETE duplicate_item
FROM event_items duplicate_item
JOIN (
  SELECT
    event_id,
    LOWER(TRIM(name)) AS normalized_name,
    MIN(id) AS keeper_id
  FROM event_items
  GROUP BY event_id, LOWER(TRIM(name))
  HAVING COUNT(*) > 1
) duplicate_group
  ON duplicate_group.event_id = duplicate_item.event_id
 AND duplicate_group.normalized_name = LOWER(TRIM(duplicate_item.name))
WHERE duplicate_item.id <> duplicate_group.keeper_id;

ALTER TABLE event_items
  ADD CONSTRAINT uq_event_items_event_name UNIQUE KEY (event_id, name);
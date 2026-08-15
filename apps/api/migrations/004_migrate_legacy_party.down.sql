SET @import_event_id = (
  SELECT id
  FROM events
  WHERE description = 'Imported from legacy PartyList data'
  LIMIT 1
);

DELETE FROM events
WHERE id = @import_event_id;
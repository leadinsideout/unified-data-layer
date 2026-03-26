-- Migration: 020_merge_clients_function.sql
-- Description: Reusable function to merge duplicate client records
-- Purpose: Consolidate multiple client records into a single canonical record
-- Use case: Fireflies creates clients by work email, manual imports use personal email,
--           questionnaire uploads create @placeholder.local clients from filenames
-- Date: 2026-02-27

CREATE OR REPLACE FUNCTION merge_clients(
  p_canonical_id UUID,
  p_source_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_id UUID;
  v_canonical_client RECORD;
  v_source_client RECORD;
  v_total_items_moved INTEGER := 0;
  v_total_coach_clients_added INTEGER := 0;
  v_total_api_keys_moved INTEGER := 0;
  v_total_api_usage_moved INTEGER := 0;
  v_total_clients_deleted INTEGER := 0;
  v_step_count INTEGER;
  v_result JSONB;
  v_merged_metadata JSONB := '{}'::jsonb;
  v_source_details JSONB := '[]'::jsonb;
BEGIN
  -- Validate canonical client exists
  SELECT * INTO v_canonical_client FROM clients WHERE id = p_canonical_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical client % not found', p_canonical_id;
  END IF;

  -- Process each source client
  FOREACH v_source_id IN ARRAY p_source_ids
  LOOP
    -- Validate source client exists
    SELECT * INTO v_source_client FROM clients WHERE id = v_source_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Source client % not found', v_source_id;
    END IF;

    -- Cannot merge a client into itself
    IF v_source_id = p_canonical_id THEN
      RAISE EXCEPTION 'Cannot merge client % into itself', v_source_id;
    END IF;

    -- Record source details before deletion
    v_source_details := v_source_details || jsonb_build_array(jsonb_build_object(
      'id', v_source_id,
      'name', v_source_client.name,
      'email', v_source_client.email,
      'created_at', v_source_client.created_at
    ));

    -- 1. Move data_items from source to canonical
    UPDATE data_items
    SET client_id = p_canonical_id,
        updated_at = NOW()
    WHERE client_id = v_source_id;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    v_total_items_moved := v_total_items_moved + v_step_count;

    -- 2. Merge coach_clients (handle UNIQUE constraint with ON CONFLICT)
    INSERT INTO coach_clients (coach_id, client_id)
    SELECT coach_id, p_canonical_id
    FROM coach_clients
    WHERE client_id = v_source_id
    ON CONFLICT (coach_id, client_id) DO NOTHING;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    v_total_coach_clients_added := v_total_coach_clients_added + v_step_count;

    -- 3. Move API keys (if any exist for source client)
    UPDATE api_keys
    SET client_id = p_canonical_id
    WHERE client_id = v_source_id;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    v_total_api_keys_moved := v_total_api_keys_moved + v_step_count;

    -- 4. Update api_usage references
    UPDATE api_usage
    SET client_id = p_canonical_id
    WHERE client_id = v_source_id;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    v_total_api_usage_moved := v_total_api_usage_moved + v_step_count;

    -- 5. Preserve source metadata in merge history
    v_merged_metadata := v_merged_metadata || jsonb_build_object(
      v_source_id::text, jsonb_build_object(
        'name', v_source_client.name,
        'email', v_source_client.email,
        'original_metadata', COALESCE(v_source_client.metadata, '{}'::jsonb),
        'merged_at', NOW()
      )
    );

    -- 6. Delete source client (CASCADE removes remaining coach_clients entries)
    DELETE FROM clients WHERE id = v_source_id;
    v_total_clients_deleted := v_total_clients_deleted + 1;
  END LOOP;

  -- 7. Update canonical client metadata with merge history
  UPDATE clients
  SET metadata = COALESCE(metadata, '{}'::jsonb) ||
      jsonb_build_object('merge_history', v_merged_metadata),
      updated_at = NOW()
  WHERE id = p_canonical_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'canonical_id', p_canonical_id,
    'canonical_name', v_canonical_client.name,
    'canonical_email', v_canonical_client.email,
    'sources_merged', v_source_details,
    'data_items_moved', v_total_items_moved,
    'coach_clients_added', v_total_coach_clients_added,
    'api_keys_moved', v_total_api_keys_moved,
    'api_usage_moved', v_total_api_usage_moved,
    'clients_deleted', v_total_clients_deleted,
    'merged_at', NOW()
  );

  RETURN v_result;
END;
$$;

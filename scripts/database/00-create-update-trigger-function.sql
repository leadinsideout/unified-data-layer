-- Helper function: update_updated_at_column
-- This function is used by triggers to automatically update the updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Helper function update_updated_at_column() created successfully' AS status;

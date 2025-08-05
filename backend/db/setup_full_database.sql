-- =============================
-- Smart Library Platform: Full Database Setup
-- =============================

-- 1. Create schema and tables
SOURCE backend/db/schema.sql;

-- 2. Insert sample data
SOURCE backend/db/sample_data.sql;

-- 3. Create stored functions
SOURCE backend/db/functions.sql;

-- 4. Create triggers
SOURCE backend/db/functions_triggers.sql;

-- 5. Create stored procedures
SOURCE backend/db/procedures.sql;

-- 6. Add indexes and optimization
SOURCE backend/db/optimize.sql;

-- =============================
-- End of setup
-- =============================

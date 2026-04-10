-- ============================================================
-- P2M dashboard compatible schema + data import from nqms_bdd.sql
-- Source dataset: RTU, optical_route, otdr_test, otdr_event, alarm
-- Target dataset: rtu, fibre, measurement, fiber_routes, alarms, otdr_test_results
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Enum types expected by Sequelize models
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE enum_rtu_status AS ENUM ('online', 'offline', 'warning', 'unreachable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_rtu_power AS ENUM ('normal', 'failure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_rtu_otdr_status AS ENUM ('ready', 'busy', 'fault');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_fibre_status AS ENUM ('normal', 'degraded', 'broken');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_measurement_test_result AS ENUM ('pass', 'fail');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_measurement_wavelength AS ENUM ('1310', '1550', '1625');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_fiber_routes_fiber_status AS ENUM ('normal', 'degraded', 'broken');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_fiber_routes_route_status AS ENUM ('active', 'inactive', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_alarms_alarm_type AS ENUM ('Fiber Cut', 'High Loss', 'RTU Down', 'Temperature', 'Maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_alarms_severity AS ENUM ('critical', 'major', 'minor', 'info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_alarms_lifecycle_status AS ENUM ('active', 'acknowledged', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_otdr_test_results_mode AS ENUM ('auto', 'manual', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_otdr_test_results_wavelength_nm AS ENUM ('1310', '1550', '1625');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enum_otdr_test_results_result AS ENUM ('pass', 'fail');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- 2) Core tables used by current backend
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rtu (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  location_latitude DECIMAL(10, 7),
  location_longitude DECIMAL(10, 7),
  location_address VARCHAR(255),
  ip_address VARCHAR(45),
  serial_number VARCHAR(50) UNIQUE,
  status enum_rtu_status NOT NULL DEFAULT 'online',
  power enum_rtu_power,
  temperature DOUBLE PRECISION,
  otdr_status enum_rtu_otdr_status,
  attenuation_db DOUBLE PRECISION,
  installation_date TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE,
  user_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fibre (
  id SERIAL PRIMARY KEY,
  rtu_id INTEGER NOT NULL REFERENCES rtu(id) ON DELETE CASCADE,
  name VARCHAR(20) NOT NULL,
  length DOUBLE PRECISION,
  status enum_fibre_status NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS measurement (
  id SERIAL PRIMARY KEY,
  fibre_id INTEGER NOT NULL REFERENCES fibre(id) ON DELETE CASCADE,
  attenuation DOUBLE PRECISION,
  test_result enum_measurement_test_result NOT NULL,
  wavelength enum_measurement_wavelength NOT NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiber_routes (
  id SERIAL PRIMARY KEY,
  route_name VARCHAR(100) NOT NULL UNIQUE,
  source VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  fiber_status enum_fiber_routes_fiber_status NOT NULL DEFAULT 'normal',
  route_status enum_fiber_routes_route_status NOT NULL DEFAULT 'active',
  length_km DOUBLE PRECISION,
  attenuation_db DOUBLE PRECISION,
  reflection_events BOOLEAN NOT NULL DEFAULT FALSE,
  last_test_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alarms (
  id SERIAL PRIMARY KEY,
  rtu_id INTEGER REFERENCES rtu(id) ON DELETE SET NULL,
  fibre_id INTEGER REFERENCES fibre(id) ON DELETE SET NULL,
  route_id INTEGER REFERENCES fiber_routes(id) ON DELETE SET NULL,
  alarm_type enum_alarms_alarm_type NOT NULL,
  severity enum_alarms_severity NOT NULL,
  lifecycle_status enum_alarms_lifecycle_status NOT NULL DEFAULT 'active',
  message VARCHAR(400) NOT NULL,
  location VARCHAR(255),
  localization_km VARCHAR(100),
  owner VARCHAR(100),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_comment VARCHAR(400),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otdr_test_results (
  id SERIAL PRIMARY KEY,
  rtu_id INTEGER REFERENCES rtu(id) ON DELETE SET NULL,
  route_id INTEGER REFERENCES fiber_routes(id) ON DELETE SET NULL,
  mode enum_otdr_test_results_mode NOT NULL,
  pulse_width VARCHAR(50),
  dynamic_range_db DOUBLE PRECISION,
  wavelength_nm enum_otdr_test_results_wavelength_nm NOT NULL,
  result enum_otdr_test_results_result NOT NULL,
  tested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Keep all original OTDR event detail in a legacy table
CREATE TABLE IF NOT EXISTS nqms_legacy_otdr_event (
  id INTEGER PRIMARY KEY,
  test_id INTEGER NOT NULL,
  event_number INTEGER NOT NULL,
  distance_km NUMERIC(10, 4),
  event_type VARCHAR(100),
  event_category VARCHAR(50),
  splice_loss_db NUMERIC(7, 3),
  refl_loss_db NUMERIC(7, 3),
  slope_db_km NUMERIC(7, 3),
  comments TEXT,
  severity VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fibre_rtu_id ON fibre(rtu_id);
CREATE INDEX IF NOT EXISTS idx_measurement_fibre_id ON measurement(fibre_id);
CREATE INDEX IF NOT EXISTS idx_measurement_timestamp ON measurement("timestamp");
CREATE INDEX IF NOT EXISTS idx_alarm_rtu_id ON alarms(rtu_id);
CREATE INDEX IF NOT EXISTS idx_alarm_fibre_id ON alarms(fibre_id);
CREATE INDEX IF NOT EXISTS idx_alarm_route_id ON alarms(route_id);
CREATE INDEX IF NOT EXISTS idx_alarm_lifecycle_status ON alarms(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_alarm_occurred_at ON alarms(occurred_at);
CREATE INDEX IF NOT EXISTS idx_otdr_results_route_id ON otdr_test_results(route_id);

-- ------------------------------------------------------------
-- 3) Staging data (copied from nqms_bdd.sql)
-- ------------------------------------------------------------
CREATE TEMP TABLE stage_nqms_rtu (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  supplier VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  module VARCHAR(100),
  module_sn VARCHAR(100),
  software_ver VARCHAR(50),
  operator VARCHAR(100),
  status VARCHAR(20),
  power_supply VARCHAR(20),
  temperature_c NUMERIC(5, 2),
  otdr_avail VARCHAR(20),
  location VARCHAR(200)
) ON COMMIT DROP;

CREATE TEMP TABLE stage_nqms_route (
  id INTEGER PRIMARY KEY,
  rtu_id INTEGER NOT NULL,
  cable_id VARCHAR(100),
  fiber_id VARCHAR(50),
  location_a VARCHAR(200),
  location_b VARCHAR(200),
  wavelength_nm NUMERIC(7, 1),
  fiber_type VARCHAR(100),
  length_km NUMERIC(10, 4),
  attenuation_db NUMERIC(8, 3),
  orl_db NUMERIC(8, 3),
  status VARCHAR(20),
  build_condition VARCHAR(50),
  user_offset_m NUMERIC(10, 2),
  index_refraction NUMERIC(7, 6)
) ON COMMIT DROP;

CREATE TEMP TABLE stage_nqms_test (
  id INTEGER PRIMARY KEY,
  route_id INTEGER NOT NULL,
  rtu_id INTEGER NOT NULL,
  test_date TIMESTAMP,
  test_mode VARCHAR(20),
  pulse_width_ns INTEGER,
  range_km NUMERIC(10, 4),
  resolution_m NUMERIC(8, 4),
  dynamic_range_db NUMERIC(6, 2),
  num_averages INTEGER,
  num_data_points INTEGER,
  total_loss_db NUMERIC(8, 3),
  orl_db NUMERIC(8, 3),
  result VARCHAR(10),
  checksum_valid BOOLEAN,
  raw_file VARCHAR(255)
) ON COMMIT DROP;

CREATE TEMP TABLE stage_nqms_event (
  id INTEGER PRIMARY KEY,
  test_id INTEGER NOT NULL,
  event_number INTEGER NOT NULL,
  distance_km NUMERIC(10, 4),
  event_type VARCHAR(100),
  event_category VARCHAR(50),
  splice_loss_db NUMERIC(7, 3),
  refl_loss_db NUMERIC(7, 3),
  slope_db_km NUMERIC(7, 3),
  comments TEXT,
  severity VARCHAR(20)
) ON COMMIT DROP;

CREATE TEMP TABLE stage_nqms_alarm (
  id INTEGER PRIMARY KEY,
  rtu_id INTEGER,
  route_id INTEGER,
  event_id INTEGER,
  alarm_type VARCHAR(50),
  severity VARCHAR(20),
  status VARCHAR(20),
  localization_km NUMERIC(10, 4),
  description TEXT,
  occurred_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  cleared_at TIMESTAMP,
  acknowledged_by VARCHAR(100)
) ON COMMIT DROP;

INSERT INTO stage_nqms_rtu (
  id, name, supplier, model, serial_number, module, module_sn, software_ver, operator, status, power_supply, temperature_c, otdr_avail, location
) VALUES
  (1, 'RTU-HP-001', 'Hewlett Packard', 'E6000A', '3617G00108', 'E6008A', 'DE37300051', '3.0', 'HP', 'Online', 'Normal', NULL, 'Ready', 'Site A - Central'),
  (2, 'RTU-NOYES-001', 'Noyes', 'M200', NULL, NULL, NULL, '0.0.14', 'SUZY', 'Online', 'Normal', NULL, 'Ready', 'Conant - Morrill Corridor'),
  (3, 'RTU-OPTIXS-001', 'OptixS', 'OPXOTDR', '000', 'SM/1310/1550', '09811', 'v9.09  VA=110105', NULL, 'Online', 'Normal', NULL, 'Ready', 'Site B - Field');

INSERT INTO stage_nqms_route (
  id, rtu_id, cable_id, fiber_id, location_a, location_b, wavelength_nm, fiber_type, length_km, attenuation_db, orl_db, status, build_condition, user_offset_m, index_refraction
) VALUES
  (1, 1, 'K1 AB', NULL, NULL, NULL, 1310.0, NULL, 50.7279, 0.000, 0.000, 'Normal', 'CC (as-current)', 0, 1.471100),
  (2, 2, 'M200_DEMO_D', '005', 'Conant', 'Morrill', 1310.0, NULL, 3.7872, 2.564, 30.279, 'Normal', 'BC (as-built)', 7475, 1.467700),
  (3, 3, NULL, NULL, NULL, NULL, 1310.0, 'G.652 (standard SMF)', 17.0654, 6.390, 32.392, 'Normal', 'BC (as-built)', 0, 1.475000);

INSERT INTO stage_nqms_test (
  id, route_id, rtu_id, test_date, test_mode, pulse_width_ns, range_km, resolution_m, dynamic_range_db, num_averages, num_data_points, total_loss_db, orl_db, result, checksum_valid, raw_file
) VALUES
  (1, 1, 1, TO_TIMESTAMP(886668374), 'Manual', 1000, 59.9951, 5.0947, 81.50, 30, 11776, 0.000, 0.000, 'Pass', TRUE, 'demo_ab.sor'),
  (2, 2, 2, TO_TIMESTAMP(1150538471), 'Manual', 100, 8.1704, 0.5107, 77.00, 6656, 16000, 2.564, 30.279, 'Pass', TRUE, 'M200_Sample_005_S13.sor'),
  (3, 3, 3, TO_TIMESTAMP(1321951763), 'Manual', 1000, 79.9582, 5.0812, 80.00, 16380, 15736, 6.390, 32.392, 'Warning', FALSE, 'sample1310_lowDR.sor');

INSERT INTO stage_nqms_event (
  id, test_id, event_number, distance_km, event_type, event_category, splice_loss_db, refl_loss_db, slope_db_km, comments, severity
) VALUES
  (1, 1, 1, 0.000, '1F9999LS {auto} reflection', 'reflection', 0.000, -50.000, 0.000, NULL, 'Info'),
  (2, 1, 2, 12.711, '0F9999LS {auto} loss/drop/gain', 'loss', 0.209, 0.000, 0.344, NULL, 'Minor'),
  (3, 1, 3, 25.351, '1F9999LS {auto} reflection', 'reflection', 0.087, -51.514, 0.342, NULL, 'Info'),
  (4, 1, 4, 38.047, '0F9999LS {auto} loss/drop/gain', 'loss', 0.149, 0.000, 0.344, NULL, 'Minor'),
  (5, 1, 5, 50.728, '1E9999LS {auto} reflection', 'end', 13.232, -16.726, 0.344, NULL, 'Major'),
  (6, 2, 1, 0.000, '1F9999LS {auto} reflection', 'reflection', 0.168, -44.478, 0.000, 'Link Start', 'Info'),
  (7, 2, 2, 0.091, '1F9999LS {auto} reflection', 'reflection', 0.791, -38.454, 0.120, NULL, 'Major'),
  (8, 2, 3, 0.395, '1F9999LS {auto} reflection', 'reflection', 0.045, -51.983, 0.362, NULL, 'Info'),
  (9, 2, 4, 0.796, '1F9999LS {auto} reflection', 'reflection', 0.347, -58.134, 0.334, NULL, 'Minor'),
  (10, 2, 5, 3.787, '1E9999LS {auto} reflection', 'end', 0.000, -30.760, 0.321, NULL, 'Info'),
  (11, 3, 1, 0.000, '0F9999LS {auto} loss/drop/gain', 'loss', 0.000, -44.177, 0.000, NULL, 'Info'),
  (12, 3, 2, 2.020, '0F9999LS {auto} loss/drop/gain', 'loss', 0.557, -40.574, 0.334, NULL, 'Minor'),
  (13, 3, 3, 17.065, '1E9999LS {auto} reflection', 'end', 22.820, -38.395, 0.343, NULL, 'Critical');

INSERT INTO stage_nqms_alarm (
  id, rtu_id, route_id, event_id, alarm_type, severity, status, localization_km, description, occurred_at, acknowledged_at, cleared_at, acknowledged_by
) VALUES
  (
    1, 3, 3, NULL, 'Checksum Error', 'Major', 'Active', NULL,
    'File sample1310_lowDR.sor checksum invalid (59892 vs computed 62998)',
    TO_TIMESTAMP(1321951763), NULL, NULL, NULL
  ),
  (
    2, 3, 3, 11, 'High Loss', 'Critical', 'Active', 17.065,
    'Abnormal splice loss: 22.820 dB at 17.065 km - possible cut or bad splice',
    TO_TIMESTAMP(1321951763), NULL, NULL, NULL
  ),
  (
    3, 2, 2, 7, 'High Reflection', 'Major', 'Active', 0.091,
    'High reflection: -38.454 dB, splice loss 0.791 dB at 91 m',
    TO_TIMESTAMP(1150538471), NULL, NULL, NULL
  );

-- ------------------------------------------------------------
-- 4) Transform + import into backend tables
-- ------------------------------------------------------------
INSERT INTO rtu (
  id, name, serial_number, status, power, temperature, otdr_status, location_address,
  last_seen, created_at, updated_at
)
SELECT
  s.id,
  s.name,
  LEFT(s.serial_number, 50),
  CASE s.status
    WHEN 'Online' THEN 'online'::enum_rtu_status
    WHEN 'Offline' THEN 'offline'::enum_rtu_status
    WHEN 'Unreachable' THEN 'unreachable'::enum_rtu_status
    ELSE 'warning'::enum_rtu_status
  END AS status,
  CASE s.power_supply
    WHEN 'Normal' THEN 'normal'::enum_rtu_power
    WHEN 'Failure' THEN 'failure'::enum_rtu_power
    ELSE NULL
  END AS power,
  s.temperature_c::double precision,
  CASE s.otdr_avail
    WHEN 'Ready' THEN 'ready'::enum_rtu_otdr_status
    WHEN 'Busy' THEN 'busy'::enum_rtu_otdr_status
    WHEN 'Fault' THEN 'fault'::enum_rtu_otdr_status
    ELSE NULL
  END AS otdr_status,
  s.location,
  NOW(),
  NOW(),
  NOW()
FROM stage_nqms_rtu s
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  serial_number = EXCLUDED.serial_number,
  status = EXCLUDED.status,
  power = EXCLUDED.power,
  temperature = EXCLUDED.temperature,
  otdr_status = EXCLUDED.otdr_status,
  location_address = EXCLUDED.location_address,
  last_seen = EXCLUDED.last_seen,
  updated_at = NOW();

INSERT INTO fibre (
  id, rtu_id, name, length, status, created_at, updated_at
)
SELECT
  s.id,
  s.rtu_id,
  LEFT(COALESCE(NULLIF(s.fiber_id, ''), NULLIF(s.cable_id, ''), CONCAT('Fibre-', s.id::text)), 20),
  s.length_km::double precision,
  CASE s.status
    WHEN 'Normal' THEN 'normal'::enum_fibre_status
    WHEN 'Degraded' THEN 'degraded'::enum_fibre_status
    WHEN 'Broken' THEN 'broken'::enum_fibre_status
    ELSE 'degraded'::enum_fibre_status
  END,
  NOW(),
  NOW()
FROM stage_nqms_route s
ON CONFLICT (id) DO UPDATE
SET
  rtu_id = EXCLUDED.rtu_id,
  name = EXCLUDED.name,
  length = EXCLUDED.length,
  status = EXCLUDED.status,
  updated_at = NOW();

WITH route_reflections AS (
  SELECT
    t.route_id,
    BOOL_OR(LOWER(COALESCE(e.event_category, '')) = 'reflection') AS has_reflection
  FROM stage_nqms_test t
  LEFT JOIN stage_nqms_event e ON e.test_id = t.id
  GROUP BY t.route_id
),
route_last_test AS (
  SELECT
    route_id,
    MAX(test_date) AS last_test_time
  FROM stage_nqms_test
  GROUP BY route_id
)
INSERT INTO fiber_routes (
  id, route_name, source, destination, fiber_status, route_status,
  length_km, attenuation_db, reflection_events, last_test_time, created_at, updated_at
)
SELECT
  r.id,
  LEFT(
    CONCAT(
      COALESCE(NULLIF(r.location_a, ''), rt.name),
      ' -> ',
      COALESCE(NULLIF(r.location_b, ''), COALESCE(NULLIF(r.fiber_id, ''), NULLIF(r.cable_id, ''), CONCAT('Fibre ', r.id::text))),
      ' (',
      COALESCE(NULLIF(r.cable_id, ''), NULLIF(r.fiber_id, ''), CONCAT('Route ', r.id::text)),
      ')'
    ),
    100
  ) AS route_name,
  LEFT(COALESCE(NULLIF(r.location_a, ''), rt.name), 100) AS source,
  LEFT(COALESCE(NULLIF(r.location_b, ''), COALESCE(NULLIF(r.fiber_id, ''), NULLIF(r.cable_id, ''), CONCAT('Fibre ', r.id::text))), 100) AS destination,
  CASE r.status
    WHEN 'Normal' THEN 'normal'::enum_fiber_routes_fiber_status
    WHEN 'Degraded' THEN 'degraded'::enum_fiber_routes_fiber_status
    WHEN 'Broken' THEN 'broken'::enum_fiber_routes_fiber_status
    ELSE 'degraded'::enum_fiber_routes_fiber_status
  END AS fiber_status,
  CASE r.status
    WHEN 'Broken' THEN 'inactive'::enum_fiber_routes_route_status
    WHEN 'Unknown' THEN 'skipped'::enum_fiber_routes_route_status
    ELSE 'active'::enum_fiber_routes_route_status
  END AS route_status,
  r.length_km::double precision,
  r.attenuation_db::double precision,
  COALESCE(rr.has_reflection, FALSE),
  lt.last_test_time,
  NOW(),
  NOW()
FROM stage_nqms_route r
JOIN stage_nqms_rtu rt ON rt.id = r.rtu_id
LEFT JOIN route_reflections rr ON rr.route_id = r.id
LEFT JOIN route_last_test lt ON lt.route_id = r.id
ON CONFLICT (id) DO UPDATE
SET
  route_name = EXCLUDED.route_name,
  source = EXCLUDED.source,
  destination = EXCLUDED.destination,
  fiber_status = EXCLUDED.fiber_status,
  route_status = EXCLUDED.route_status,
  length_km = EXCLUDED.length_km,
  attenuation_db = EXCLUDED.attenuation_db,
  reflection_events = EXCLUDED.reflection_events,
  last_test_time = EXCLUDED.last_test_time,
  updated_at = NOW();

INSERT INTO measurement (
  id, fibre_id, attenuation, test_result, wavelength, "timestamp", created_at, updated_at
)
SELECT
  t.id,
  t.route_id AS fibre_id,
  t.total_loss_db::double precision AS attenuation,
  CASE t.result
    WHEN 'Pass' THEN 'pass'::enum_measurement_test_result
    ELSE 'fail'::enum_measurement_test_result
  END AS test_result,
  CASE
    WHEN ROUND(r.wavelength_nm)::integer = 1310 THEN '1310'::enum_measurement_wavelength
    WHEN ROUND(r.wavelength_nm)::integer = 1550 THEN '1550'::enum_measurement_wavelength
    WHEN ROUND(r.wavelength_nm)::integer = 1625 THEN '1625'::enum_measurement_wavelength
    ELSE '1550'::enum_measurement_wavelength
  END AS wavelength,
  t.test_date,
  NOW(),
  NOW()
FROM stage_nqms_test t
JOIN stage_nqms_route r ON r.id = t.route_id
ON CONFLICT (id) DO UPDATE
SET
  fibre_id = EXCLUDED.fibre_id,
  attenuation = EXCLUDED.attenuation,
  test_result = EXCLUDED.test_result,
  wavelength = EXCLUDED.wavelength,
  "timestamp" = EXCLUDED."timestamp",
  updated_at = NOW();

INSERT INTO otdr_test_results (
  id, rtu_id, route_id, mode, pulse_width, dynamic_range_db, wavelength_nm, result, tested_at, created_at, updated_at
)
SELECT
  t.id,
  t.rtu_id,
  t.route_id,
  CASE t.test_mode
    WHEN 'Auto' THEN 'auto'::enum_otdr_test_results_mode
    WHEN 'Scheduled' THEN 'scheduled'::enum_otdr_test_results_mode
    ELSE 'manual'::enum_otdr_test_results_mode
  END AS mode,
  CASE
    WHEN t.pulse_width_ns IS NULL THEN NULL
    ELSE CONCAT(t.pulse_width_ns::text, ' ns')
  END AS pulse_width,
  t.dynamic_range_db::double precision,
  CASE
    WHEN ROUND(r.wavelength_nm)::integer = 1310 THEN '1310'::enum_otdr_test_results_wavelength_nm
    WHEN ROUND(r.wavelength_nm)::integer = 1550 THEN '1550'::enum_otdr_test_results_wavelength_nm
    WHEN ROUND(r.wavelength_nm)::integer = 1625 THEN '1625'::enum_otdr_test_results_wavelength_nm
    ELSE '1550'::enum_otdr_test_results_wavelength_nm
  END AS wavelength_nm,
  CASE t.result
    WHEN 'Pass' THEN 'pass'::enum_otdr_test_results_result
    ELSE 'fail'::enum_otdr_test_results_result
  END AS result,
  t.test_date,
  NOW(),
  NOW()
FROM stage_nqms_test t
JOIN stage_nqms_route r ON r.id = t.route_id
ON CONFLICT (id) DO UPDATE
SET
  rtu_id = EXCLUDED.rtu_id,
  route_id = EXCLUDED.route_id,
  mode = EXCLUDED.mode,
  pulse_width = EXCLUDED.pulse_width,
  dynamic_range_db = EXCLUDED.dynamic_range_db,
  wavelength_nm = EXCLUDED.wavelength_nm,
  result = EXCLUDED.result,
  tested_at = EXCLUDED.tested_at,
  updated_at = NOW();

INSERT INTO alarms (
  id, rtu_id, fibre_id, route_id, alarm_type, severity, lifecycle_status, message,
  location, localization_km, owner, occurred_at, acknowledged_at, resolved_at,
  resolution_comment, created_at, updated_at
)
SELECT
  a.id,
  a.rtu_id,
  a.route_id AS fibre_id,
  a.route_id,
  CASE a.alarm_type
    WHEN 'Fiber Cut' THEN 'Fiber Cut'::enum_alarms_alarm_type
    WHEN 'High Loss' THEN 'High Loss'::enum_alarms_alarm_type
    WHEN 'RTU Down' THEN 'RTU Down'::enum_alarms_alarm_type
    WHEN 'Checksum Error' THEN 'Maintenance'::enum_alarms_alarm_type
    WHEN 'Degraded Signal' THEN 'High Loss'::enum_alarms_alarm_type
    WHEN 'High Reflection' THEN 'High Loss'::enum_alarms_alarm_type
    WHEN 'EOT Exceeded' THEN 'High Loss'::enum_alarms_alarm_type
    ELSE 'Maintenance'::enum_alarms_alarm_type
  END AS alarm_type,
  CASE a.severity
    WHEN 'Critical' THEN 'critical'::enum_alarms_severity
    WHEN 'Major' THEN 'major'::enum_alarms_severity
    WHEN 'Minor' THEN 'minor'::enum_alarms_severity
    ELSE 'info'::enum_alarms_severity
  END AS severity,
  CASE a.status
    WHEN 'Acknowledged' THEN 'acknowledged'::enum_alarms_lifecycle_status
    WHEN 'Cleared' THEN 'closed'::enum_alarms_lifecycle_status
    ELSE 'active'::enum_alarms_lifecycle_status
  END AS lifecycle_status,
  LEFT(COALESCE(a.description, CONCAT('Imported alarm #', a.id::text)), 400) AS message,
  r.location AS location,
  a.localization_km::text,
  a.acknowledged_by,
  a.occurred_at,
  a.acknowledged_at,
  a.cleared_at,
  CASE WHEN a.status = 'Cleared' THEN 'Imported as closed from legacy alarm status Cleared' ELSE NULL END,
  COALESCE(a.occurred_at, NOW()),
  NOW()
FROM stage_nqms_alarm a
LEFT JOIN stage_nqms_rtu r ON r.id = a.rtu_id
ON CONFLICT (id) DO UPDATE
SET
  rtu_id = EXCLUDED.rtu_id,
  fibre_id = EXCLUDED.fibre_id,
  route_id = EXCLUDED.route_id,
  alarm_type = EXCLUDED.alarm_type,
  severity = EXCLUDED.severity,
  lifecycle_status = EXCLUDED.lifecycle_status,
  message = EXCLUDED.message,
  location = EXCLUDED.location,
  localization_km = EXCLUDED.localization_km,
  owner = EXCLUDED.owner,
  occurred_at = EXCLUDED.occurred_at,
  acknowledged_at = EXCLUDED.acknowledged_at,
  resolved_at = EXCLUDED.resolved_at,
  resolution_comment = EXCLUDED.resolution_comment,
  updated_at = NOW();

INSERT INTO nqms_legacy_otdr_event (
  id, test_id, event_number, distance_km, event_type, event_category,
  splice_loss_db, refl_loss_db, slope_db_km, comments, severity, created_at
)
SELECT
  e.id,
  e.test_id,
  e.event_number,
  e.distance_km,
  e.event_type,
  e.event_category,
  e.splice_loss_db,
  e.refl_loss_db,
  e.slope_db_km,
  e.comments,
  e.severity,
  NOW()
FROM stage_nqms_event e
ON CONFLICT (id) DO UPDATE
SET
  test_id = EXCLUDED.test_id,
  event_number = EXCLUDED.event_number,
  distance_km = EXCLUDED.distance_km,
  event_type = EXCLUDED.event_type,
  event_category = EXCLUDED.event_category,
  splice_loss_db = EXCLUDED.splice_loss_db,
  refl_loss_db = EXCLUDED.refl_loss_db,
  slope_db_km = EXCLUDED.slope_db_km,
  comments = EXCLUDED.comments,
  severity = EXCLUDED.severity;

-- ------------------------------------------------------------
-- 5) Reset sequences after explicit IDs
-- ------------------------------------------------------------
DO $$
DECLARE
  seq_name TEXT;
BEGIN
  seq_name := pg_get_serial_sequence('rtu', 'id');
  IF seq_name IS NOT NULL THEN
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM rtu), 1), true)', seq_name);
  END IF;

  seq_name := pg_get_serial_sequence('fibre', 'id');
  IF seq_name IS NOT NULL THEN
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM fibre), 1), true)', seq_name);
  END IF;

  seq_name := pg_get_serial_sequence('measurement', 'id');
  IF seq_name IS NOT NULL THEN
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM measurement), 1), true)', seq_name);
  END IF;

  seq_name := pg_get_serial_sequence('fiber_routes', 'id');
  IF seq_name IS NOT NULL THEN
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM fiber_routes), 1), true)', seq_name);
  END IF;

  seq_name := pg_get_serial_sequence('alarms', 'id');
  IF seq_name IS NOT NULL THEN
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM alarms), 1), true)', seq_name);
  END IF;

  seq_name := pg_get_serial_sequence('otdr_test_results', 'id');
  IF seq_name IS NOT NULL THEN
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM otdr_test_results), 1), true)', seq_name);
  END IF;
END $$;

COMMIT;

-- Quick verification:
-- SELECT COUNT(*) FROM rtu;
-- SELECT COUNT(*) FROM fibre;
-- SELECT COUNT(*) FROM measurement;
-- SELECT COUNT(*) FROM fiber_routes;
-- SELECT COUNT(*) FROM alarms;
-- SELECT COUNT(*) FROM otdr_test_results;
-- SELECT COUNT(*) FROM nqms_legacy_otdr_event;

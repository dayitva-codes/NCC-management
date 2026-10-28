"""
Generates a complete, ready-to-run supabase_schema.sql file for 1-click execution
in Supabase SQL Editor.
"""
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable
from app.db.base import Base
import app.models

output_file = "supabase_schema.sql"

lines = [
    "-- ====================================================================",
    "-- CADET-360: National Cadet Corps Management Platform",
    "-- Complete Supabase / PostgreSQL Database Schema & Baseline Seed Data",
    "-- ====================================================================",
    "-- INSTRUCTIONS: Paste this script into Supabase SQL Editor and click RUN.",
    "-- ====================================================================\n",
    "-- Enable UUID / JSON extensions if needed",
    "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n",
]

# Generate CREATE TABLE statements for all models in topological dependency order
for table in Base.metadata.sorted_tables:
    create_stmt = CreateTable(table).compile(dialect=postgresql.dialect())
    sql_text = str(create_stmt).strip()
    # Make CREATE TABLE IF NOT EXISTS
    sql_text = sql_text.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
    lines.append(f"-- Table: {table.name}")
    lines.append(sql_text + ";\n")

# Add Baseline Seed Data (Criteria, Battalions, Colleges, Initial Admin)
lines.extend([
    "-- ====================================================================",
    "-- Baseline Seed: Commanding Officer Admin Account",
    "-- Email: admin@ncc.local | Password: password123 / admin123",
    "-- ====================================================================",
    "INSERT INTO users (email, hashed_password, role, is_active, is_verified, created_at) "
    "VALUES ('admin@ncc.local', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', true, true, NOW()) "
    "ON CONFLICT (email) DO NOTHING;\n",

    "-- ====================================================================",
    "-- Baseline Seed: 9-Pillars Evaluation Criteria with Priorities",
    "-- ====================================================================",
    "INSERT INTO evaluation_criteria (name, label, priority, icon, description, category, max_score, is_active, created_by_role) VALUES",
    "('drill', '1. Drill & Parade Precision', 'high', '🎖️', 'Foot drill, rifle drill, ceremonial parade precision, and squad synchronization.', 'core', 10, 1, 'admin'),",
    "('physical_fitness', '2. Physical Fitness & Endurance', 'high', '🏃', '5km battle run, pushups, situps, chin-ups, obstacle negotiation, and physical stamina.', 'core', 10, 1, 'admin'),",
    "('discipline', '3. Discipline & Military Bearing', 'high', '🛡️', 'Military bearing, saluting, adherence to command orders, kit inspection, and turnout.', 'core', 10, 1, 'admin'),",
    "('leadership', '4. Leadership & Squad Command', 'high', '⭐', 'Section leading, giving words of command (Awaaz), initiative, and commanding confidence.', 'core', 10, 1, 'admin'),",
    "('ncc_knowledge', '5. NCC Knowledge & Service SOPs', 'normal', '📖', 'NCC history, armed forces organizational structure, military geography, and service protocols.', 'core', 10, 1, 'admin'),",
    "('communication', '6. Communication & Briefing Skills', 'normal', '📢', 'Verbal debriefing, clarity of orders, lecturette delivery, and situation reporting.', 'core', 10, 1, 'admin'),",
    "('teamwork', '7. Teamwork & Esprit de Corps', 'normal', '🤝', 'Section cohesion, mutual support, morale, camaraderie, and collective task execution.', 'core', 10, 1, 'admin'),",
    "('punctuality', '8. Time Punctuality & Turnout', 'low', '⏱️', 'Reporting on parade timing, roll-call punctuality, and personal turnout maintenance.', 'core', 10, 1, 'admin'),",
    "('attendance', '9. Parade & Drill Attendance Rate', 'low', '📋', 'Institutional training parade attendance compliance (75% statutory requirement).', 'core', 10, 1, 'admin')",
    "ON CONFLICT (name) DO NOTHING;\n",

    "-- ====================================================================",
    "-- Baseline Seed: Raipur Group NCC Battalions",
    "-- ====================================================================",
    "INSERT INTO battalions (name, code) VALUES",
    "('27 CG Bn NCC, Raipur', '27-CG-BN-RAIPUR'),",
    "('8 CG Girls Bn NCC, Raipur', '8-CG-GIRLS-RAIPUR'),",
    "('7 CG Bn NCC, Bilaspur', '7-CG-BN-BILASPUR'),",
    "('37 CG Bn NCC, Durg', '37-CG-BN-DURG'),",
    "('38 CG Bn NCC, Rajnandgaon/Durg', '38-CG-BN-DURG'),",
    "('5 CG CT (I) Coy NCC, Raipur', '5-CG-CT-RAIPUR'),",
    "('1 CG Naval Unit NCC, Raipur', '1-CG-NAV-RAIPUR'),",
    "('3 CG Air Sqn NCC, Raipur', '3-CG-AIR-RAIPUR'),",
    "('1 CG Girls Bn NCC, Jagdalpur', '1-CG-GIRLS-JDP'),",
    "('1 CG Bn NCC, Ambikapur', '1-CG-BN-AMB'),",
    "('1 CG R&V Regt NCC, Anjora Durg', '1-CG-RV-DURG'),",
    "('8 CG (I) Coy NCC, Kanker', '8-CG-COY-KANKER'),",
    "('9 CG (I) Coy NCC, Jagdalpur', '9-CG-COY-JDP'),",
    "('10 CG (I) Coy NCC, Jagdalpur', '10-CG-COY-JDP'),",
    "('28 CG Bn NCC, Raigarh', '28-CG-BN-RAIGARH'),",
    "('3 MP Girls Bn NCC (HQ)', '3MP-HQ')",
    "ON CONFLICT (code) DO NOTHING;\n",

    "-- ====================================================================",
    "-- Baseline Seed: Affiliated Colleges & Institutions",
    "-- ====================================================================",
    "INSERT INTO colleges (battalion_id, name, academic_year_start) VALUES",
    "((SELECT id FROM battalions WHERE code = '27-CG-BN-RAIPUR' LIMIT 1), 'Govt. Nagarjun PG College of Science, Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '27-CG-BN-RAIPUR' LIMIT 1), 'National Institute of Technology (NIT) Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '27-CG-BN-RAIPUR' LIMIT 1), 'Rajeev Lochan College, Rajim', 2026),",
    "((SELECT id FROM battalions WHERE code = '27-CG-BN-RAIPUR' LIMIT 1), 'Bhavan''s R.K. Sarda Vidya Mandir, Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '8-CG-GIRLS-RAIPUR' LIMIT 1), 'Govt. Dudhadhari Bajrang (D.B.) Girls PG Autonomous College, Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '8-CG-GIRLS-RAIPUR' LIMIT 1), 'Shri Shankaracharya Institute of Professional Management and Technology (SSIPMT), Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '8-CG-GIRLS-RAIPUR' LIMIT 1), 'Govt Girls Post Graduate College, Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '7-CG-BN-BILASPUR' LIMIT 1), 'Govt. E. Raghavendra Rao PG Science College, Bilaspur', 2026),",
    "((SELECT id FROM battalions WHERE code = '7-CG-BN-BILASPUR' LIMIT 1), 'Govt. Bilasa Girls PG College, Bilaspur', 2026),",
    "((SELECT id FROM battalions WHERE code = '37-CG-BN-DURG' LIMIT 1), 'Govt. V.Y.T. PG Autonomous College, Durg', 2026),",
    "((SELECT id FROM battalions WHERE code = '37-CG-BN-DURG' LIMIT 1), 'Bhilai Institute of Technology (BIT), Durg', 2026),",
    "((SELECT id FROM battalions WHERE code = '38-CG-BN-DURG' LIMIT 1), 'SKS College of Agriculture & Research Station (SKS CARS), Rajnandgaon', 2026),",
    "((SELECT id FROM battalions WHERE code = '38-CG-BN-DURG' LIMIT 1), 'Govt. Digvijay Autonomous PG College, Rajnandgaon', 2026),",
    "((SELECT id FROM battalions WHERE code = '5-CG-CT-RAIPUR' LIMIT 1), 'Govt. Nagarjun PG College of Science (Signal Division), Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '5-CG-CT-RAIPUR' LIMIT 1), 'Govt. Polytechnic College, Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '1-CG-NAV-RAIPUR' LIMIT 1), 'Govt. J. Yoganandam Chhattisgarh College, Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '1-CG-NAV-RAIPUR' LIMIT 1), 'Govt. Engineering College (GEC), Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '3-CG-AIR-RAIPUR' LIMIT 1), 'PM SHRI Jawahar Navodaya Vidyalaya, Jashpur (Air Wing)', 2026),",
    "((SELECT id FROM battalions WHERE code = '3-CG-AIR-RAIPUR' LIMIT 1), 'Govt. College of Science (Air Squadron Division), Raipur', 2026),",
    "((SELECT id FROM battalions WHERE code = '1-CG-GIRLS-JDP' LIMIT 1), 'Govt. Engineering College (GEC) Jagdalpur', 2026),",
    "((SELECT id FROM battalions WHERE code = '1-CG-GIRLS-JDP' LIMIT 1), 'Govt. Danteshwari Girls College, Jagdalpur', 2026),",
    "((SELECT id FROM battalions WHERE code = '1-CG-BN-AMB' LIMIT 1), 'Sainik School Ambikapur', 2026),",
    "((SELECT id FROM battalions WHERE code = '1-CG-BN-AMB' LIMIT 1), 'Govt. Rajiv Gandhi PG College, Ambikapur', 2026),",
    "((SELECT id FROM battalions WHERE code = '1-CG-RV-DURG' LIMIT 1), 'College of Veterinary Science & Animal Husbandry, Anjora, Durg', 2026),",
    "((SELECT id FROM battalions WHERE code = '8-CG-COY-KANKER' LIMIT 1), 'Govt. Bhanupratap Dev PG College, Kanker', 2026),",
    "((SELECT id FROM battalions WHERE code = '9-CG-COY-JDP' LIMIT 1), 'Govt. Kakatiya PG College, Jagdalpur', 2026),",
    "((SELECT id FROM battalions WHERE code = '10-CG-COY-JDP' LIMIT 1), 'Shaheed Mahendra Karma Vishwavidyalaya, Bastar', 2026),",
    "((SELECT id FROM battalions WHERE code = '28-CG-BN-RAIGARH' LIMIT 1), 'Kirodimal Govt. Arts & Science College, Raigarh', 2026),",
    "((SELECT id FROM battalions WHERE code = '3MP-HQ' LIMIT 1), 'Govt Girls Post Graduate College', 2026),",
    "((SELECT id FROM battalions WHERE code = '3MP-HQ' LIMIT 1), 'Govt Science & Technology College', 2026)",
    "ON CONFLICT DO NOTHING;\n",
])

with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Generated {output_file} successfully.")

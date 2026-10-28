-- ====================================================================
-- CADET-360: National Cadet Corps Management Platform
-- Complete Supabase / PostgreSQL Database Schema & Baseline Seed Data
-- ====================================================================
-- INSTRUCTIONS: Paste this script into Supabase SQL Editor and click RUN.
-- ====================================================================

-- Enable UUID / JSON extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: battalions
CREATE TABLE IF NOT EXISTS battalions (
	id SERIAL NOT NULL, 
	name VARCHAR NOT NULL, 
	code VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (code)
);

-- Table: evaluation_criteria
CREATE TABLE IF NOT EXISTS evaluation_criteria (
	id SERIAL NOT NULL, 
	name VARCHAR NOT NULL, 
	label VARCHAR, 
	max_score INTEGER NOT NULL, 
	priority VARCHAR NOT NULL, 
	description TEXT, 
	icon VARCHAR, 
	category VARCHAR, 
	created_by_role VARCHAR, 
	is_active INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

-- Table: ncc_question_topics
CREATE TABLE IF NOT EXISTS ncc_question_topics (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	default_weightage FLOAT, 
	is_active BOOLEAN, 
	PRIMARY KEY (id)
);

-- Table: ncc_test_configs
CREATE TABLE IF NOT EXISTS ncc_test_configs (
	id SERIAL NOT NULL, 
	full_mock_duration_minutes INTEGER, 
	full_mock_question_count INTEGER, 
	cert_exam_duration_minutes INTEGER, 
	cert_exam_question_count INTEGER, 
	quick_practice_duration_minutes INTEGER, 
	quick_practice_question_count INTEGER, 
	marks_per_correct FLOAT, 
	marks_per_wrong FLOAT, 
	shuffle_options BOOLEAN, 
	pass_percentage FLOAT, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

-- Table: study_materials
CREATE TABLE IF NOT EXISTS study_materials (
	id SERIAL NOT NULL, 
	title VARCHAR NOT NULL, 
	subject VARCHAR NOT NULL, 
	category VARCHAR, 
	certificate_level VARCHAR, 
	wing VARCHAR, 
	author VARCHAR, 
	edition_year VARCHAR, 
	description TEXT, 
	file_url VARCHAR, 
	cover_icon VARCHAR, 
	chapters JSON, 
	is_published BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
	id SERIAL NOT NULL, 
	email VARCHAR NOT NULL, 
	hashed_password VARCHAR NOT NULL, 
	role roleenum NOT NULL, 
	is_active BOOLEAN, 
	is_verified BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

-- Table: colleges
CREATE TABLE IF NOT EXISTS colleges (
	id SERIAL NOT NULL, 
	battalion_id INTEGER NOT NULL, 
	name VARCHAR NOT NULL, 
	academic_year_start INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(battalion_id) REFERENCES battalions (id)
);

-- Table: ncc_questions
CREATE TABLE IF NOT EXISTS ncc_questions (
	id SERIAL NOT NULL, 
	statement TEXT NOT NULL, 
	options JSON NOT NULL, 
	correct_option INTEGER NOT NULL, 
	explanation TEXT NOT NULL, 
	topic_code VARCHAR(50) NOT NULL, 
	sub_topic VARCHAR(100), 
	certificate_level VARCHAR(6) NOT NULL, 
	wing VARCHAR(6) NOT NULL, 
	difficulty VARCHAR(6) NOT NULL, 
	source_reference VARCHAR(255), 
	status VARCHAR(8) NOT NULL, 
	version INTEGER, 
	created_by_id INTEGER, 
	reviewed_by_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(topic_code) REFERENCES ncc_question_topics (code), 
	FOREIGN KEY(created_by_id) REFERENCES users (id), 
	FOREIGN KEY(reviewed_by_id) REFERENCES users (id)
);

-- Table: ncc_test_sessions
CREATE TABLE IF NOT EXISTS ncc_test_sessions (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	mode VARCHAR(16) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	certificate_level VARCHAR(10), 
	wing VARCHAR(20), 
	topic_filter VARCHAR(50), 
	question_ids JSON NOT NULL, 
	option_orders JSON NOT NULL, 
	marks_per_correct FLOAT, 
	marks_per_wrong FLOAT, 
	start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	duration_seconds INTEGER NOT NULL, 
	status VARCHAR(11) NOT NULL, 
	total_score FLOAT, 
	total_correct INTEGER, 
	total_wrong INTEGER, 
	total_unanswered INTEGER, 
	accuracy_percentage FLOAT, 
	time_spent_seconds INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

-- Table: training_tasks
CREATE TABLE IF NOT EXISTS training_tasks (
	id SERIAL NOT NULL, 
	title VARCHAR NOT NULL, 
	category VARCHAR NOT NULL, 
	target VARCHAR NOT NULL, 
	date VARCHAR NOT NULL, 
	time VARCHAR NOT NULL, 
	location VARCHAR NOT NULL, 
	priority VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	"desc" VARCHAR NOT NULL, 
	created_by_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by_id) REFERENCES users (id)
);

-- Table: cadets
CREATE TABLE IF NOT EXISTS cadets (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	college_id INTEGER NOT NULL, 
	enrollment_number VARCHAR NOT NULL, 
	full_name VARCHAR NOT NULL, 
	mobile VARCHAR NOT NULL, 
	photo_url VARCHAR, 
	academic_year INTEGER NOT NULL, 
	address VARCHAR, 
	gender genderenum NOT NULL, 
	wing wingenum NOT NULL, 
	ncc_goal VARCHAR, 
	rank VARCHAR, 
	blood_group VARCHAR, 
	dob VARCHAR, 
	guardian_name VARCHAR, 
	identification_mark VARCHAR, 
	company_platoon VARCHAR, 
	camps_attended JSON, 
	weapon_grouping VARCHAR, 
	firing_classification VARCHAR, 
	pft_score VARCHAR, 
	certificate_status VARCHAR, 
	awards JSON, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(college_id) REFERENCES colleges (id), 
	UNIQUE (enrollment_number)
);

-- Table: mentors
CREATE TABLE IF NOT EXISTS mentors (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	enrollment_number VARCHAR NOT NULL, 
	scope_level scopelevelenum NOT NULL, 
	college_id INTEGER, 
	battalion_id INTEGER, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(college_id) REFERENCES colleges (id), 
	FOREIGN KEY(battalion_id) REFERENCES battalions (id)
);

-- Table: ncc_item_statistics
CREATE TABLE IF NOT EXISTS ncc_item_statistics (
	question_id INTEGER NOT NULL, 
	total_attempts INTEGER, 
	total_correct INTEGER, 
	difficulty_index_p FLOAT, 
	discrimination_index_d FLOAT, 
	distractor_counts JSON, 
	average_time_seconds FLOAT, 
	flag_status VARCHAR(100), 
	last_recomputed_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (question_id), 
	FOREIGN KEY(question_id) REFERENCES ncc_questions (id)
);

-- Table: ncc_test_answers
CREATE TABLE IF NOT EXISTS ncc_test_answers (
	id SERIAL NOT NULL, 
	session_id INTEGER NOT NULL, 
	question_id INTEGER NOT NULL, 
	selected_option INTEGER, 
	actual_option_index INTEGER, 
	is_marked_for_review BOOLEAN, 
	time_spent_seconds INTEGER, 
	is_correct BOOLEAN, 
	marks_awarded FLOAT, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(session_id) REFERENCES ncc_test_sessions (id), 
	FOREIGN KEY(question_id) REFERENCES ncc_questions (id)
);

-- Table: attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
	id SERIAL NOT NULL, 
	cadet_id INTEGER NOT NULL, 
	date VARCHAR NOT NULL, 
	parade_type VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	marked_by_id INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cadet_id) REFERENCES cadets (id), 
	FOREIGN KEY(marked_by_id) REFERENCES users (id)
);

-- Table: evaluations
CREATE TABLE IF NOT EXISTS evaluations (
	id SERIAL NOT NULL, 
	cadet_id INTEGER NOT NULL, 
	mentor_id INTEGER NOT NULL, 
	criterion_id INTEGER NOT NULL, 
	score FLOAT NOT NULL, 
	remarks TEXT, 
	evaluated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cadet_id) REFERENCES cadets (id), 
	FOREIGN KEY(mentor_id) REFERENCES mentors (id), 
	FOREIGN KEY(criterion_id) REFERENCES evaluation_criteria (id)
);

-- ====================================================================
-- Baseline Seed: Commanding Officer Admin Account
-- Email: admin@ncc.local | Password: password123 / admin123
-- ====================================================================
INSERT INTO users (email, hashed_password, role, is_active, is_verified, created_at) VALUES ('admin@ncc.local', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', true, true, NOW()) ON CONFLICT (email) DO NOTHING;

-- ====================================================================
-- Baseline Seed: 9-Pillars Evaluation Criteria with Priorities
-- ====================================================================
INSERT INTO evaluation_criteria (name, label, priority, icon, description, category, max_score, is_active, created_by_role) VALUES
('drill', '1. Drill & Parade Precision', 'high', '🎖️', 'Foot drill, rifle drill, ceremonial parade precision, and squad synchronization.', 'core', 10, 1, 'admin'),
('physical_fitness', '2. Physical Fitness & Endurance', 'high', '🏃', '5km battle run, pushups, situps, chin-ups, obstacle negotiation, and physical stamina.', 'core', 10, 1, 'admin'),
('discipline', '3. Discipline & Military Bearing', 'high', '🛡️', 'Military bearing, saluting, adherence to command orders, kit inspection, and turnout.', 'core', 10, 1, 'admin'),
('leadership', '4. Leadership & Squad Command', 'high', '⭐', 'Section leading, giving words of command (Awaaz), initiative, and commanding confidence.', 'core', 10, 1, 'admin'),
('ncc_knowledge', '5. NCC Knowledge & Service SOPs', 'normal', '📖', 'NCC history, armed forces organizational structure, military geography, and service protocols.', 'core', 10, 1, 'admin'),
('communication', '6. Communication & Briefing Skills', 'normal', '📢', 'Verbal debriefing, clarity of orders, lecturette delivery, and situation reporting.', 'core', 10, 1, 'admin'),
('teamwork', '7. Teamwork & Esprit de Corps', 'normal', '🤝', 'Section cohesion, mutual support, morale, camaraderie, and collective task execution.', 'core', 10, 1, 'admin'),
('punctuality', '8. Time Punctuality & Turnout', 'low', '⏱️', 'Reporting on parade timing, roll-call punctuality, and personal turnout maintenance.', 'core', 10, 1, 'admin'),
('attendance', '9. Parade & Drill Attendance Rate', 'low', '📋', 'Institutional training parade attendance compliance (75% statutory requirement).', 'core', 10, 1, 'admin')
ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- Baseline Seed: Raipur Group NCC Battalions
-- ====================================================================
INSERT INTO battalions (name, code) VALUES
('27 CG Bn NCC, Raipur', '27-CG-BN-RAIPUR'),
('8 CG Girls Bn NCC, Raipur', '8-CG-GIRLS-RAIPUR'),
('7 CG Bn NCC, Bilaspur', '7-CG-BN-BILASPUR'),
('37 CG Bn NCC, Durg', '37-CG-BN-DURG'),
('38 CG Bn NCC, Rajnandgaon/Durg', '38-CG-BN-DURG'),
('5 CG CT (I) Coy NCC, Raipur', '5-CG-CT-RAIPUR'),
('1 CG Naval Unit NCC, Raipur', '1-CG-NAV-RAIPUR'),
('3 CG Air Sqn NCC, Raipur', '3-CG-AIR-RAIPUR'),
('1 CG Girls Bn NCC, Jagdalpur', '1-CG-GIRLS-JDP'),
('1 CG Bn NCC, Ambikapur', '1-CG-BN-AMB'),
('1 CG R&V Regt NCC, Anjora Durg', '1-CG-RV-DURG'),
('8 CG (I) Coy NCC, Kanker', '8-CG-COY-KANKER'),
('9 CG (I) Coy NCC, Jagdalpur', '9-CG-COY-JDP'),
('10 CG (I) Coy NCC, Jagdalpur', '10-CG-COY-JDP'),
('28 CG Bn NCC, Raigarh', '28-CG-BN-RAIGARH'),
('3 MP Girls Bn NCC (HQ)', '3MP-HQ')
ON CONFLICT (code) DO NOTHING;

-- ====================================================================
-- Baseline Seed: Affiliated Colleges & Institutions
-- ====================================================================
INSERT INTO colleges (battalion_id, name, academic_year_start) VALUES
((SELECT id FROM battalions WHERE code = '27-CG-BN-RAIPUR' LIMIT 1), 'Govt. Nagarjun PG College of Science, Raipur', 2026),
((SELECT id FROM battalions WHERE code = '27-CG-BN-RAIPUR' LIMIT 1), 'National Institute of Technology (NIT) Raipur', 2026),
((SELECT id FROM battalions WHERE code = '27-CG-BN-RAIPUR' LIMIT 1), 'Rajeev Lochan College, Rajim', 2026),
((SELECT id FROM battalions WHERE code = '27-CG-BN-RAIPUR' LIMIT 1), 'Bhavan''s R.K. Sarda Vidya Mandir, Raipur', 2026),
((SELECT id FROM battalions WHERE code = '8-CG-GIRLS-RAIPUR' LIMIT 1), 'Govt. Dudhadhari Bajrang (D.B.) Girls PG Autonomous College, Raipur', 2026),
((SELECT id FROM battalions WHERE code = '8-CG-GIRLS-RAIPUR' LIMIT 1), 'Shri Shankaracharya Institute of Professional Management and Technology (SSIPMT), Raipur', 2026),
((SELECT id FROM battalions WHERE code = '8-CG-GIRLS-RAIPUR' LIMIT 1), 'Govt Girls Post Graduate College, Raipur', 2026),
((SELECT id FROM battalions WHERE code = '7-CG-BN-BILASPUR' LIMIT 1), 'Govt. E. Raghavendra Rao PG Science College, Bilaspur', 2026),
((SELECT id FROM battalions WHERE code = '7-CG-BN-BILASPUR' LIMIT 1), 'Govt. Bilasa Girls PG College, Bilaspur', 2026),
((SELECT id FROM battalions WHERE code = '37-CG-BN-DURG' LIMIT 1), 'Govt. V.Y.T. PG Autonomous College, Durg', 2026),
((SELECT id FROM battalions WHERE code = '37-CG-BN-DURG' LIMIT 1), 'Bhilai Institute of Technology (BIT), Durg', 2026),
((SELECT id FROM battalions WHERE code = '38-CG-BN-DURG' LIMIT 1), 'SKS College of Agriculture & Research Station (SKS CARS), Rajnandgaon', 2026),
((SELECT id FROM battalions WHERE code = '38-CG-BN-DURG' LIMIT 1), 'Govt. Digvijay Autonomous PG College, Rajnandgaon', 2026),
((SELECT id FROM battalions WHERE code = '5-CG-CT-RAIPUR' LIMIT 1), 'Govt. Nagarjun PG College of Science (Signal Division), Raipur', 2026),
((SELECT id FROM battalions WHERE code = '5-CG-CT-RAIPUR' LIMIT 1), 'Govt. Polytechnic College, Raipur', 2026),
((SELECT id FROM battalions WHERE code = '1-CG-NAV-RAIPUR' LIMIT 1), 'Govt. J. Yoganandam Chhattisgarh College, Raipur', 2026),
((SELECT id FROM battalions WHERE code = '1-CG-NAV-RAIPUR' LIMIT 1), 'Govt. Engineering College (GEC), Raipur', 2026),
((SELECT id FROM battalions WHERE code = '3-CG-AIR-RAIPUR' LIMIT 1), 'PM SHRI Jawahar Navodaya Vidyalaya, Jashpur (Air Wing)', 2026),
((SELECT id FROM battalions WHERE code = '3-CG-AIR-RAIPUR' LIMIT 1), 'Govt. College of Science (Air Squadron Division), Raipur', 2026),
((SELECT id FROM battalions WHERE code = '1-CG-GIRLS-JDP' LIMIT 1), 'Govt. Engineering College (GEC) Jagdalpur', 2026),
((SELECT id FROM battalions WHERE code = '1-CG-GIRLS-JDP' LIMIT 1), 'Govt. Danteshwari Girls College, Jagdalpur', 2026),
((SELECT id FROM battalions WHERE code = '1-CG-BN-AMB' LIMIT 1), 'Sainik School Ambikapur', 2026),
((SELECT id FROM battalions WHERE code = '1-CG-BN-AMB' LIMIT 1), 'Govt. Rajiv Gandhi PG College, Ambikapur', 2026),
((SELECT id FROM battalions WHERE code = '1-CG-RV-DURG' LIMIT 1), 'College of Veterinary Science & Animal Husbandry, Anjora, Durg', 2026),
((SELECT id FROM battalions WHERE code = '8-CG-COY-KANKER' LIMIT 1), 'Govt. Bhanupratap Dev PG College, Kanker', 2026),
((SELECT id FROM battalions WHERE code = '9-CG-COY-JDP' LIMIT 1), 'Govt. Kakatiya PG College, Jagdalpur', 2026),
((SELECT id FROM battalions WHERE code = '10-CG-COY-JDP' LIMIT 1), 'Shaheed Mahendra Karma Vishwavidyalaya, Bastar', 2026),
((SELECT id FROM battalions WHERE code = '28-CG-BN-RAIGARH' LIMIT 1), 'Kirodimal Govt. Arts & Science College, Raigarh', 2026),
((SELECT id FROM battalions WHERE code = '3MP-HQ' LIMIT 1), 'Govt Girls Post Graduate College', 2026),
((SELECT id FROM battalions WHERE code = '3MP-HQ' LIMIT 1), 'Govt Science & Technology College', 2026)
ON CONFLICT DO NOTHING;

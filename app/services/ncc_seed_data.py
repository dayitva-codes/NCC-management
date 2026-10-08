from sqlalchemy.orm import Session
from app.models.ncc_mock_test import (
    CertificateLevelEnum,
    NCCQuestion,
    NCCQuestionTopic,
    QuestionDifficultyEnum,
    QuestionStatusEnum,
    WingApplicabilityEnum,
)

TOPICS_DATA = [
    {"code": "ncc_organisation_history", "name": "NCC Organisation & History", "default_weightage": 8.0},
    {"code": "aim_motto_song", "name": "Aim, Motto, Pledge & Song", "default_weightage": 5.0},
    {"code": "ranks_insignia", "name": "Ranks & Insignia (Armed Forces & NCC)", "default_weightage": 6.0},
    {"code": "wings_specialised", "name": "Service Wings (Army, Navy, Air)", "default_weightage": 6.0},
    {"code": "drill_commands", "name": "Drill & Words of Command", "default_weightage": 10.0},
    {"code": "weapon_training", "name": "Weapon Training (.22 & 7.62mm SLR)", "default_weightage": 12.0},
    {"code": "map_reading", "name": "Map Reading & Prismatic Compass", "default_weightage": 10.0},
    {"code": "fieldcraft_battlecraft", "name": "Field Craft & Battle Craft (FC & BC)", "default_weightage": 8.0},
    {"code": "leadership_personality", "name": "Leadership & Personality Development", "default_weightage": 6.0},
    {"code": "national_integration", "name": "National Integration & Heritage", "default_weightage": 5.0},
    {"code": "disaster_management", "name": "Disaster Management & Relief", "default_weightage": 5.0},
    {"code": "social_service", "name": "Social Service & Community Development", "default_weightage": 4.0},
    {"code": "health_hygiene", "name": "Health, Hygiene & Sanitation", "default_weightage": 4.0},
    {"code": "first_aid", "name": "First Aid & CPR", "default_weightage": 4.0},
    {"code": "adventure_activities", "name": "Adventure Activities & Expeditions", "default_weightage": 3.0},
    {"code": "self_defence", "name": "Self Defence & Unarmed Combat", "default_weightage": 2.0},
    {"code": "environment_awareness", "name": "Environmental Awareness & Conservation", "default_weightage": 2.0},
    {"code": "military_history", "name": "Military History & War Heroes", "default_weightage": 5.0},
    {"code": "general_ncc_awareness", "name": "General NCC & Defence Awareness", "default_weightage": 5.0},
]

QUESTIONS_DATA = [
    # Topic 1: NCC Organisation & History
    {
        "statement": "In which year was the National Cadet Corps (NCC) officially established in independent India under the National Cadet Corps Act?",
        "options": ["1947", "1948", "1950", "1952"],
        "correct_option": 1,
        "explanation": "The National Cadet Corps came into existence on 15th July 1948 under the National Cadet Corps Act XXXI of 1948 passed by Parliament.",
        "topic_code": "ncc_organisation_history",
        "sub_topic": "Establishment",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "NCC Cadet Handbook, Common Subjects, Ch 1, p. 3",
    },
    {
        "statement": "Which committee recommended the formation of the National Cadet Corps in India?",
        "options": ["Kothari Committee", "Pt. H.N. Kunzru Committee", "Sardar Patel Committee", "Dr. Radhakrishnan Committee"],
        "correct_option": 1,
        "explanation": "The Kunzru Committee headed by Pandit H.N. Kunzru recommended a cadet organization to be established in schools and colleges at a national level in 1946.",
        "topic_code": "ncc_organisation_history",
        "sub_topic": "Committees",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "NCC Cadet Handbook, Ch 1, p. 2",
    },

    # Topic 2: Aim, Motto, Song
    {
        "statement": "What is the official motto of the National Cadet Corps?",
        "options": ["Service and Loyalty", "Duty, Honour, Country", "Unity and Discipline", "Valour and Wisdom"],
        "correct_option": 2,
        "explanation": "The motto of NCC is 'Unity and Discipline' (Ekta aur Anushasan), adopted on 23 December 1957.",
        "topic_code": "aim_motto_song",
        "sub_topic": "Motto",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Cadet Hand Book (Common), Section 1, p. 5",
    },
    {
        "statement": "What are the three colors present in the official NCC flag representing the Army, Navy, and Air Force respectively?",
        "options": [
            "Saffron, White, and Green",
            "Red, Dark Blue, and Light Blue",
            "Gold, Navy Blue, and Sky Blue",
            "Maroon, Black, and Sky Blue"
        ],
        "correct_option": 1,
        "explanation": "The NCC flag contains three vertical stripes: Red (Army), Dark Blue (Navy), and Light Blue (Air Force).",
        "topic_code": "aim_motto_song",
        "sub_topic": "Flag Insignia",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Cadet Hand Book (Common), Section 1, p. 6",
    },

    # Topic 3: Ranks & Insignia
    {
        "statement": "Which of the following is the highest cadet rank attainable by an NCC Senior Division cadet in a battalion?",
        "options": ["Senior Under Officer (SUO)", "Company Quarter Master Sergeant (CQMS)", "Regimental Havildar Major (RHM)", "Junior Under Officer (JUO)"],
        "correct_option": 0,
        "explanation": "Senior Under Officer (SUO) is the highest cadet rank in the NCC Senior Division/Wing structure.",
        "topic_code": "ranks_insignia",
        "sub_topic": "Cadet Ranks",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "NCC Training Manual, Part I, p. 12",
    },
    {
        "statement": "What is the rank badge insignia worn on epaulettes by a Lieutenant Colonel in the Indian Army?",
        "options": ["Ashoka Lion Capital only", "Five-pointed Star only", "National Emblem and one Five-pointed Star", "Two Five-pointed Stars"],
        "correct_option": 2,
        "explanation": "A Lieutenant Colonel in the Indian Army wears the National Emblem (Ashoka Lion Capital) and one five-pointed star.",
        "topic_code": "ranks_insignia",
        "sub_topic": "Armed Forces Ranks",
        "certificate_level": CertificateLevelEnum.C,
        "wing": WingApplicabilityEnum.army,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Armed Forces Manual, Insignia Reference, p. 18",
    },

    # Topic 4: Drill & Drill Commands
    {
        "statement": "In 'Vishram' (Stand at Ease) position, what is the standard distance maintained between the two heels?",
        "options": ["6 inches", "10 inches", "12 inches", "18 inches"],
        "correct_option": 2,
        "explanation": "In Vishram position, the distance between the heels is 12 inches (30 cm), and toes are placed 18 inches apart at an angle of 45 degrees.",
        "topic_code": "drill_commands",
        "sub_topic": "Foot Drill",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Drill Manual for NCC, Section 2 (Foot Drill), p. 8",
    },
    {
        "statement": "What angle do the feet form at the heels in the 'Savdhan' (Attention) position?",
        "options": ["30 degrees", "45 degrees", "60 degrees", "90 degrees"],
        "correct_option": 0,
        "explanation": "In Savdhan position, heels are together touching each other, and feet are turned out equally forming an angle of 30 degrees.",
        "topic_code": "drill_commands",
        "sub_topic": "Foot Drill",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Drill Manual for NCC, Section 2, p. 6",
    },
    {
        "statement": "During Marching ('Tez Chal'), what is the standard regulation pace length in inches for Senior Division cadets?",
        "options": ["24 inches", "30 inches", "33 inches", "40 inches"],
        "correct_option": 1,
        "explanation": "The standard length of a normal marching pace in Quick Time (Tez Chal) is 30 inches.",
        "topic_code": "drill_commands",
        "sub_topic": "Marching",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Drill Manual for NCC, Section 3, p. 15",
    },
    {
        "statement": "On which foot is the cautionary word of command 'Tham' (Halt) given during quick march?",
        "options": ["Right foot", "Left foot", "Either foot simultaneously", "When both feet are grounded"],
        "correct_option": 1,
        "explanation": "The word of command 'Tham' is always given when the Left Foot passes or strikes the ground.",
        "topic_code": "drill_commands",
        "sub_topic": "Words of Command",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Drill Manual for NCC, Section 4, p. 21",
    },

    # Topic 5: Weapon Training
    {
        "statement": "What is the effective range of a .22 Deluxe Rifle used in NCC weapon training?",
        "options": ["25 yards", "50 yards", "100 yards", "300 yards"],
        "correct_option": 0,
        "explanation": "The effective range of a .22 Deluxe rifle is 25 yards (approximately 23 meters).",
        "topic_code": "weapon_training",
        "sub_topic": ".22 Rifle",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Weapon Training Manual for NCC, Ch 2, p. 14",
    },
    {
        "statement": "What is the magazine capacity of the 7.62mm Self-Loading Rifle (SLR)?",
        "options": ["10 rounds", "20 rounds", "28 rounds", "30 rounds"],
        "correct_option": 1,
        "explanation": "The magazine capacity of the standard 7.62mm SLR is 20 rounds.",
        "topic_code": "weapon_training",
        "sub_topic": "7.62mm SLR",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.army,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Weapon Training Manual, Ch 3, p. 28",
    },
    {
        "statement": "What are the three core principles of good shooting (The Triad of Good Shooting)?",
        "options": [
            "Speed, Reflex, and Breathing",
            "Firm grip, Correct aiming, and Smooth trigger operation",
            "Distance estimation, Eye closing, and Fast cocking",
            "Standing position, Rapid fire, and Barrel cleaning"
        ],
        "correct_option": 1,
        "explanation": "The fundamental principles of good shooting (H.A.T) are: 1. Good Holding (Firm grip), 2. Good Aiming, 3. Good Trigger operation.",
        "topic_code": "weapon_training",
        "sub_topic": "Principles of Shooting",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Weapon Training Manual, Ch 4, p. 33",
    },
    {
        "statement": "What is the calibre of the 5.56mm INSAS rifle used in service training?",
        "options": ["5.56 mm", "7.62 mm", "9 mm", ".22 inches"],
        "correct_option": 0,
        "explanation": "The calibre of the Indian Small Arms System (INSAS) rifle is 5.56 mm.",
        "topic_code": "weapon_training",
        "sub_topic": "INSAS",
        "certificate_level": CertificateLevelEnum.C,
        "wing": WingApplicabilityEnum.army,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Weapon Training Manual, Ch 5, p. 45",
    },

    # Topic 6: Map Reading
    {
        "statement": "What type of north is indicated by the direction of the vertical grid lines on a Survey of India Topographical Map?",
        "options": ["True North", "Magnetic North", "Grid North", "Celestial North"],
        "correct_option": 2,
        "explanation": "Grid North is the direction indicated by the vertical grid lines (Eastings) running top to bottom on the map sheet.",
        "topic_code": "map_reading",
        "sub_topic": "Types of North",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Map Reading Manual, Section 2, p. 11",
    },
    {
        "statement": "What instrument is most commonly used by field soldiers and cadets to measure magnetic bearings on ground?",
        "options": ["Theodolite", "Liquid Prismatic Compass", "Sextant", "Clinometer"],
        "correct_option": 1,
        "explanation": "The Liquid Prismatic Compass Mk III A is the primary instrument used for measuring magnetic bearings in the field.",
        "topic_code": "map_reading",
        "sub_topic": "Compass",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Map Reading Manual, Section 4, p. 25",
    },
    {
        "statement": "If the Forward Bearing of a landmark is 65 degrees, what is its corresponding Back Bearing?",
        "options": ["115 degrees", "180 degrees", "245 degrees", "305 degrees"],
        "correct_option": 2,
        "explanation": "Back Bearing = Forward Bearing + 180° (if Forward Bearing is less than 180°). Here: 65° + 180° = 245°.",
        "topic_code": "map_reading",
        "sub_topic": "Bearings Calculation",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Map Reading Manual, Section 5, p. 32",
    },
    {
        "statement": "On a standard 1:50,000 scale Survey of India map, what ground distance is represented by 2 centimetres on the map?",
        "options": ["500 metres", "1 kilometre", "2 kilometres", "5 kilometres"],
        "correct_option": 1,
        "explanation": "At 1:50,000 scale, 1 cm represents 50,000 cm = 500 metres. Thus, 2 cm represents 1,000 metres = 1 kilometre.",
        "topic_code": "map_reading",
        "sub_topic": "Scale Calculation",
        "certificate_level": CertificateLevelEnum.C,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.hard,
        "source_reference": "Map Reading Manual, Section 1, p. 5",
    },

    # Topic 7: Field Craft & Battle Craft (FC & BC)
    {
        "statement": "Which of the following is NOT one of the six primary reasons why things are seen in the field ('Why things are seen')?",
        "options": ["Shape", "Shadow", "Speed of running", "Surface / Shine"],
        "correct_option": 2,
        "explanation": "The standard reasons why things are seen are Shape, Shine, Shadow, Spacing, Silhouette, Surface, and Movement (not speed of running).",
        "topic_code": "fieldcraft_battlecraft",
        "sub_topic": "Camouflage & Concealment",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.army,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Field Craft & Battle Craft Manual, Ch 2, p. 17",
    },
    {
        "statement": "What is the maximum effective distance up to which human figures and their facial features can be clearly distinguished by the naked eye under standard daylight?",
        "options": ["100 yards", "200 yards", "300 yards", "500 yards"],
        "correct_option": 0,
        "explanation": "At 100 yards, a person's facial features and eyes can be distinctly recognized in clear daylight.",
        "topic_code": "fieldcraft_battlecraft",
        "sub_topic": "Judging Distance",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.army,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Field Craft & Battle Craft Manual, Ch 3, p. 24",
    },
    {
        "statement": "Which field signal is indicated by raising the right arm vertically above the head with palm open to the front?",
        "options": ["Advance", "Halt", "Double Time", "Take Cover"],
        "correct_option": 1,
        "explanation": "Raising the right arm fully vertical with open palm to the front is the universal field signal for 'Halt' (Tham).",
        "topic_code": "fieldcraft_battlecraft",
        "sub_topic": "Field Signals",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.army,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Field Craft & Battle Craft Manual, Ch 4, p. 38",
    },

    # Topic 8: First Aid & Disaster Management
    {
        "statement": "What does the abbreviation CPR stand for in emergency first aid resuscitation?",
        "options": [
            "Cardio-Pulmonary Resuscitation",
            "Central Pulse Recovery",
            "Coronary Pressure Relief",
            "Cardiovascular Patient Response"
        ],
        "correct_option": 0,
        "explanation": "CPR stands for Cardio-Pulmonary Resuscitation, an emergency lifesaving procedure performed when the heart stops beating.",
        "topic_code": "first_aid",
        "sub_topic": "Resuscitation",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "First Aid & Hygiene Handbook, Ch 3, p. 22",
    },
    {
        "statement": "In managing severe arterial bleeding from a limb, which is the immediate priority action?",
        "options": [
            "Wash with abundant cold water",
            "Apply firm direct pressure with a clean dressing pad",
            "Apply petroleum ointment",
            "Induce vomiting"
        ],
        "correct_option": 1,
        "explanation": "The most effective primary step for controlling external hemorrhage is applying direct pressure over the wound using a sterile dressing.",
        "topic_code": "first_aid",
        "sub_topic": "Hemorrhage",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "First Aid & Hygiene Handbook, Ch 2, p. 15",
    },
    {
        "statement": "What is the designated toll-free national emergency response telephone number in India for disaster management and police assistance?",
        "options": ["100", "108", "112", "181"],
        "correct_option": 2,
        "explanation": "112 is India's single unified all-in-one Emergency Response Support System (ERSS) number covering police, fire, and ambulance/disaster response.",
        "topic_code": "disaster_management",
        "sub_topic": "Emergency Numbers",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Disaster Management Handbook, Ch 1, p. 8",
    },

    # Topic 9: Military History & War Heroes
    {
        "statement": "Who was the first recipient of the Param Vir Chakra (PVC), India's highest military decoration for gallantry?",
        "options": ["Major Somnath Sharma", "Captain Vikram Batra", "Company Quarter Master Havildar Abdul Hamid", "Lance Naik Albert Ekka"],
        "correct_option": 0,
        "explanation": "Major Somnath Sharma was posthumously awarded India's first Param Vir Chakra for bravery during the Battle of Badgam in November 1947.",
        "topic_code": "military_history",
        "sub_topic": "Param Vir Chakra",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Military History for NCC Cadets, Ch 2, p. 19",
    },
    {
        "statement": "In which year was the Kargil War (Operation Vijay) fought between India and Pakistani infiltrators in Jammu and Kashmir?",
        "options": ["1965", "1971", "1984", "1999"],
        "correct_option": 3,
        "explanation": "Operation Vijay was conducted in May–July 1999 to recapture high-altitude posts in the Kargil sector of Jammu and Kashmir.",
        "topic_code": "military_history",
        "sub_topic": "Operation Vijay",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Military History for NCC Cadets, Ch 4, p. 41",
    },
    {
        "statement": "Who was the Chief of Army Staff during the 1971 Indo-Pak Liberation War of Bangladesh, later elevated to Field Marshal?",
        "options": ["K.M. Cariappa", "Sam Manekshaw", "K.S. Thimayya", "J.N. Chaudhuri"],
        "correct_option": 1,
        "explanation": "Field Marshal Sam Hormusji Framji Jamshedji Manekshaw was Chief of the Army Staff during the 1971 war that led to the creation of Bangladesh.",
        "topic_code": "military_history",
        "sub_topic": "War Commanders",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Military History for NCC Cadets, Ch 3, p. 30",
    },

    # Topic 10: Leadership & National Integration
    {
        "statement": "Which of the following is considered an essential leadership trait according to NCC leadership doctrine?",
        "options": ["Authoritarianism", "Integrity", "Aloofness", "Bias"],
        "correct_option": 1,
        "explanation": "Integrity (uprightness of character and moral soundness) is considered the foremost foundation of military and civic leadership.",
        "topic_code": "leadership_personality",
        "sub_topic": "Traits",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Personality Development and Leadership Manual, Ch 1, p. 7",
    },
    {
        "statement": "What is the primary national aim of the Ek Bharat Shreshtha Bharat (EBSB) special national integration camps organized by NCC?",
        "options": [
            "Intense combat firing practice",
            "Promoting mutual cultural understanding between paired states",
            "Selection for Olympics shooting squads",
            "Foreign diplomatic deployment"
        ],
        "correct_option": 1,
        "explanation": "EBSB camps are structured to celebrate unity in diversity by pairing cadets from different Indian states to share language, customs, and heritage.",
        "topic_code": "national_integration",
        "sub_topic": "National Integration Camps",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "National Integration & Awareness Manual, Ch 2, p. 14",
    },

    # Topic 11: Health & Hygiene
    {
        "statement": "Which chemical agent is most commonly utilized for municipal well and camp field water purification?",
        "options": ["Bleaching Powder (Chlorinated Lime)", "Potassium Dichromate", "Sodium Bicarbonate", "Copper Sulphate"],
        "correct_option": 0,
        "explanation": "Bleaching powder containing available chlorine is the standard chemical used for disinfecting open drinking water wells and field water points.",
        "topic_code": "health_hygiene",
        "sub_topic": "Water Purification",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Health & Hygiene Manual, Ch 1, p. 9",
    },

    # Topic 12: Adventure Activities & Environment
    {
        "statement": "Where is the premier Himalayan Mountaineering Institute (HMI), which conducts adventure courses for NCC cadets, located?",
        "options": ["Manali, Himachal Pradesh", "Darjeeling, West Bengal", "Uttarkashi, Uttarakhand", "Pahalgam, Jammu and Kashmir"],
        "correct_option": 1,
        "explanation": "HMI was established in Darjeeling, West Bengal in 1954 to commemorate Tenzing Norgay and Sir Edmund Hillary's ascent of Everest.",
        "topic_code": "adventure_activities",
        "sub_topic": "Institutes",
        "certificate_level": CertificateLevelEnum.B,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.medium,
        "source_reference": "Adventure Activities Manual, Ch 3, p. 28",
    },
    {
        "statement": "Under the 'Puneet Sagar Abhiyan' flagship campaign, what primary ecological conservation task is undertaken by NCC cadets across India?",
        "options": [
            "Cleaning plastic waste from sea beaches, rivers, and water bodies",
            "Digging borewells in arid states",
            "Conducting wildlife census in national parks",
            "Planting commercial timber forests"
        ],
        "correct_option": 0,
        "explanation": "Puneet Sagar Abhiyan was launched nationwide by NCC to clean beaches, riverfronts, and lakes of plastic and create public awareness on clean water bodies.",
        "topic_code": "environment_awareness",
        "sub_topic": "Puneet Sagar Abhiyan",
        "certificate_level": CertificateLevelEnum.A,
        "wing": WingApplicabilityEnum.common,
        "difficulty": QuestionDifficultyEnum.easy,
        "source_reference": "Social Service & Environment Handbook, Ch 4, p. 36",
    },
]


def seed_ncc_topics_and_questions(db: Session):
    """Seed syllabus topics and initial bank of NCC certificate questions."""
    # Ensure tables exist before querying
    try:
        from app.db.base import Base
        from app.db.session import engine
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass

    # 1. Seed Topics
    try:
        for t_data in TOPICS_DATA:
            existing = db.query(NCCQuestionTopic).filter(NCCQuestionTopic.code == t_data["code"]).first()
            if not existing:
                topic = NCCQuestionTopic(
                    code=t_data["code"],
                    name=t_data["name"],
                    default_weightage=t_data["default_weightage"],
                    is_active=True,
                )
                db.add(topic)
        db.commit()
    except Exception:
        db.rollback()

    # 2. Seed Questions
    try:
        if db.query(NCCQuestion).count() == 0:
            for q_data in QUESTIONS_DATA:
                c_lvl = q_data["certificate_level"]
                c_lvl_str = c_lvl.value if hasattr(c_lvl, "value") else str(c_lvl)
                w_val = q_data["wing"]
                w_val_str = w_val.value if hasattr(w_val, "value") else str(w_val)
                d_val = q_data["difficulty"]
                d_val_str = d_val.value if hasattr(d_val, "value") else str(d_val)

                question = NCCQuestion(
                    statement=q_data["statement"],
                    options=q_data["options"],
                    correct_option=q_data["correct_option"],
                    explanation=q_data["explanation"],
                    topic_code=q_data["topic_code"],
                    sub_topic=q_data.get("sub_topic"),
                    certificate_level=c_lvl_str,
                    wing=w_val_str,
                    difficulty=d_val_str,
                    source_reference=q_data["source_reference"],
                    status="approved",
                )
                db.add(question)
            db.commit()
    except Exception:
        db.rollback()


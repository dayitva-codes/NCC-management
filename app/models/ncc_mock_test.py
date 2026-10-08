import enum
from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class CertificateLevelEnum(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    common = "common"


class WingApplicabilityEnum(str, enum.Enum):
    common = "common"
    army = "army"
    navy = "navy"
    air = "air"


class QuestionDifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuestionStatusEnum(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    retired = "retired"


class NCCTestModeEnum(str, enum.Enum):
    full_mock = "full_mock"                  # 100 Q, 90 min (or balanced blueprint)
    certificate_wise = "certificate_wise"    # Certificate A, B, or C exam practice
    topic_wise = "topic_wise"                # Specific syllabus topic drill
    quick_practice = "quick_practice"        # 20-Q fast sprint
    weak_areas = "weak_areas"                # Spaced-repetition targeted practice


class NCCTestStatusEnum(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    expired = "expired"


class NCCQuestionTopic(Base):
    __tablename__ = "ncc_question_topics"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    default_weightage = Column(Float, default=5.0)  # Percentage in full mock blueprint
    is_active = Column(Boolean, default=True)

    questions = relationship("NCCQuestion", back_populates="topic")


class NCCQuestion(Base):
    __tablename__ = "ncc_questions"

    id = Column(Integer, primary_key=True, index=True)
    statement = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # List of 4 option strings
    correct_option = Column(Integer, nullable=False)  # Index 0, 1, 2, or 3 (never sent to client pre-submission)
    explanation = Column(Text, nullable=False)  # Handbook explanation & citation
    topic_code = Column(String(50), ForeignKey("ncc_question_topics.code"), index=True, nullable=False)
    sub_topic = Column(String(100), nullable=True)
    certificate_level = Column(Enum(CertificateLevelEnum, native_enum=False), default=CertificateLevelEnum.common, nullable=False)
    wing = Column(Enum(WingApplicabilityEnum, native_enum=False), default=WingApplicabilityEnum.common, nullable=False)
    difficulty = Column(Enum(QuestionDifficultyEnum, native_enum=False), default=QuestionDifficultyEnum.medium, nullable=False)
    source_reference = Column(String(255), nullable=True)  # Handbook, chapter, page
    status = Column(Enum(QuestionStatusEnum, native_enum=False), default=QuestionStatusEnum.approved, nullable=False)
    version = Column(Integer, default=1)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    topic = relationship("NCCQuestionTopic", back_populates="questions")
    statistics = relationship("NCCItemStatistics", uselist=False, back_populates="question", cascade="all, delete-orphan")


class NCCTestSession(Base):
    __tablename__ = "ncc_test_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    mode = Column(Enum(NCCTestModeEnum, native_enum=False), default=NCCTestModeEnum.quick_practice, nullable=False)
    title = Column(String(200), nullable=False)
    certificate_level = Column(String(10), nullable=True)
    wing = Column(String(20), nullable=True)
    topic_filter = Column(String(50), nullable=True)
    question_ids = Column(JSON, default=list, nullable=False)  # List of question IDs in this session
    option_orders = Column(JSON, default=dict, nullable=False)  # {str(qid): [shuffled indices 0..3]}
    marks_per_correct = Column(Float, default=1.0)
    marks_per_wrong = Column(Float, default=-0.25)
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=False)  # Server-authoritative end timestamp
    duration_seconds = Column(Integer, nullable=False)
    status = Column(Enum(NCCTestStatusEnum, native_enum=False), default=NCCTestStatusEnum.in_progress, nullable=False)
    total_score = Column(Float, nullable=True)
    total_correct = Column(Integer, default=0)
    total_wrong = Column(Integer, default=0)
    total_unanswered = Column(Integer, default=0)
    accuracy_percentage = Column(Float, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    answers = relationship("NCCTestAnswer", back_populates="session", cascade="all, delete-orphan")


class NCCTestAnswer(Base):
    __tablename__ = "ncc_test_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("ncc_test_sessions.id"), index=True, nullable=False)
    question_id = Column(Integer, ForeignKey("ncc_questions.id"), index=True, nullable=False)
    selected_option = Column(Integer, nullable=True)  # Shuffled index (0-3) chosen by cadet
    actual_option_index = Column(Integer, nullable=True)  # Mapped original question option index
    is_marked_for_review = Column(Boolean, default=False)
    time_spent_seconds = Column(Integer, default=0)
    is_correct = Column(Boolean, nullable=True)
    marks_awarded = Column(Float, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("NCCTestSession", back_populates="answers")
    question = relationship("NCCQuestion")


class NCCItemStatistics(Base):
    __tablename__ = "ncc_item_statistics"

    question_id = Column(Integer, ForeignKey("ncc_questions.id"), primary_key=True)
    total_attempts = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    difficulty_index_p = Column(Float, default=0.0)  # P = correct / total
    discrimination_index_d = Column(Float, default=0.0)  # D = P_upper_27 - P_lower_27
    distractor_counts = Column(JSON, default=lambda: {"0": 0, "1": 0, "2": 0, "3": 0})
    average_time_seconds = Column(Float, default=0.0)
    flag_status = Column(String(100), default="ok")  # "ok", "too_hard", "too_easy", "negative_discrimination", "ambiguous_key"
    last_recomputed_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("NCCQuestion", back_populates="statistics")


class NCCTestConfig(Base):
    __tablename__ = "ncc_test_configs"

    id = Column(Integer, primary_key=True)
    full_mock_duration_minutes = Column(Integer, default=90)
    full_mock_question_count = Column(Integer, default=40)
    cert_exam_duration_minutes = Column(Integer, default=45)
    cert_exam_question_count = Column(Integer, default=30)
    quick_practice_duration_minutes = Column(Integer, default=20)
    quick_practice_question_count = Column(Integer, default=20)
    marks_per_correct = Column(Float, default=1.0)
    marks_per_wrong = Column(Float, default=-0.25)
    shuffle_options = Column(Boolean, default=True)
    pass_percentage = Column(Float, default=45.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

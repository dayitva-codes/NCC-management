from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.models.ncc_mock_test import (
    CertificateLevelEnum,
    NCCTestModeEnum,
    NCCTestStatusEnum,
    QuestionDifficultyEnum,
    QuestionStatusEnum,
    WingApplicabilityEnum,
)


class TopicOut(BaseModel):
    id: int
    code: str
    name: str
    default_weightage: float
    is_active: bool
    question_count: Optional[int] = 0

    class Config:
        from_attributes = True


class QuestionInSessionOut(BaseModel):
    id: int
    statement: str
    options: List[str]  # 4 shuffled option strings
    topic_code: str
    sub_topic: Optional[str] = None
    certificate_level: Any = "common"
    wing: Any = "common"
    difficulty: Any = "medium"

    # Crucial security: correct_option & explanation are omitted here to prevent answer leakage!


class QuestionReviewOut(BaseModel):
    id: int
    statement: str
    options: List[str]
    selected_option: Optional[int] = None
    actual_option_index: Optional[int] = None
    correct_option: int
    is_correct: Optional[bool] = None
    is_marked_for_review: bool = False
    marks_awarded: Optional[float] = 0.0
    explanation: str
    source_reference: Optional[str] = None
    time_spent_seconds: int = 0
    topic_code: str
    sub_topic: Optional[str] = None


class TestSessionCreate(BaseModel):
    mode: Any = NCCTestModeEnum.quick_practice
    certificate_level: Optional[Any] = None
    wing: Optional[Any] = None
    topic_code: Optional[str] = None


class SavedAnswerItem(BaseModel):
    selected_option: Optional[int] = None
    is_marked_for_review: bool = False
    time_spent_seconds: int = 0


class TestSessionOut(BaseModel):
    id: int
    mode: Any
    title: str
    certificate_level: Optional[str] = None
    wing: Optional[str] = None
    topic_filter: Optional[str] = None
    duration_seconds: int
    remaining_seconds: int
    start_time: datetime
    end_time: datetime
    status: Any
    marks_per_correct: float
    marks_per_wrong: float
    total_questions: int
    questions: List[QuestionInSessionOut] = []
    saved_answers: Dict[str, SavedAnswerItem] = {}

    class Config:
        from_attributes = True


class AnswerSaveRequest(BaseModel):
    question_id: int
    selected_option: Optional[int] = None  # None clears response; 0-3 sets response
    is_marked_for_review: bool = False
    time_spent_seconds: int = 0


class AnswerSaveResponse(BaseModel):
    success: bool
    question_id: int
    selected_option: Optional[int] = None
    is_marked_for_review: bool = False
    server_time: datetime


class TopicBreakdownItem(BaseModel):
    topic_code: str
    topic_name: str
    total_questions: int
    correct: int
    wrong: int
    unanswered: int
    accuracy: float
    marks_obtained: float


class TestSessionResultOut(BaseModel):
    session_id: int
    user_id: int
    user_name: Optional[str] = None
    cadet_name: Optional[str] = None
    cadet_regimental_number: Optional[str] = None
    cadet_rank: Optional[str] = None
    college_name: Optional[str] = None
    battalion_name: Optional[str] = None
    title: str
    mode: NCCTestModeEnum
    status: NCCTestStatusEnum
    total_questions: int
    total_correct: int
    total_wrong: int
    total_unanswered: int
    total_score: float
    max_possible_score: float
    accuracy_percentage: float
    time_spent_seconds: int
    cohort_average_score: Optional[float] = None
    topic_breakdown: List[TopicBreakdownItem] = []
    questions_review: List[QuestionReviewOut] = []

    class Config:
        from_attributes = True


class ItemAnalysisOut(BaseModel):
    question_id: int
    statement: str
    topic_code: str
    certificate_level: str
    wing: str
    difficulty: str
    total_attempts: int
    total_correct: int
    difficulty_index_p: float
    discrimination_index_d: float
    distractor_counts: Dict[str, int]
    average_time_seconds: float
    flag_status: str

    class Config:
        from_attributes = True


class QuestionCreateRequest(BaseModel):
    statement: str
    options: List[str]
    correct_option: int  # 0, 1, 2, or 3
    explanation: str
    topic_code: str
    sub_topic: Optional[str] = None
    certificate_level: CertificateLevelEnum = CertificateLevelEnum.common
    wing: WingApplicabilityEnum = WingApplicabilityEnum.common
    difficulty: QuestionDifficultyEnum = QuestionDifficultyEnum.medium
    source_reference: Optional[str] = None


class CSVImportResult(BaseModel):
    total_rows: int
    imported_count: int
    skipped_count: int
    errors: List[Dict[str, Any]] = []


# --- Admin Complete Customization Schemas ---

class NCCTestConfigOut(BaseModel):
    full_mock_duration_minutes: int
    full_mock_question_count: int
    cert_exam_duration_minutes: int
    cert_exam_question_count: int
    quick_practice_duration_minutes: int
    quick_practice_question_count: int
    marks_per_correct: float
    marks_per_wrong: float
    shuffle_options: bool
    pass_percentage: float
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NCCTestConfigUpdate(BaseModel):
    full_mock_duration_minutes: Optional[int] = None
    full_mock_question_count: Optional[int] = None
    cert_exam_duration_minutes: Optional[int] = None
    cert_exam_question_count: Optional[int] = None
    quick_practice_duration_minutes: Optional[int] = None
    quick_practice_question_count: Optional[int] = None
    marks_per_correct: Optional[float] = None
    marks_per_wrong: Optional[float] = None
    shuffle_options: Optional[bool] = None
    pass_percentage: Optional[float] = None


class QuestionAdminOut(BaseModel):
    id: int
    statement: str
    options: List[str]
    correct_option: int
    explanation: str
    topic_code: str
    sub_topic: Optional[str] = None
    certificate_level: CertificateLevelEnum
    wing: WingApplicabilityEnum
    difficulty: QuestionDifficultyEnum
    source_reference: Optional[str] = None
    status: QuestionStatusEnum
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuestionAdminUpdate(BaseModel):
    statement: Optional[str] = None
    options: Optional[List[str]] = None
    correct_option: Optional[int] = None
    explanation: Optional[str] = None
    topic_code: Optional[str] = None
    sub_topic: Optional[str] = None
    certificate_level: Optional[CertificateLevelEnum] = None
    wing: Optional[WingApplicabilityEnum] = None
    difficulty: Optional[QuestionDifficultyEnum] = None
    source_reference: Optional[str] = None
    status: Optional[QuestionStatusEnum] = None


class TopicAdminCreate(BaseModel):
    code: str
    name: str
    default_weightage: float = 5.0
    is_active: bool = True


class TopicAdminUpdate(BaseModel):
    name: Optional[str] = None
    default_weightage: Optional[float] = None
    is_active: Optional[bool] = None


class CadetSessionAdminOut(BaseModel):
    id: int
    user_id: int
    cadet_id: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    cadet_regimental_number: Optional[str] = None
    cadet_rank: Optional[str] = None
    college_name: Optional[str] = None
    mode: str
    title: str
    status: str
    total_score: Optional[float] = None
    total_correct: int = 0
    total_wrong: int = 0
    total_unanswered: int = 0
    accuracy_percentage: Optional[float] = None
    duration_seconds: int = 0
    time_spent_seconds: int = 0
    start_time: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionListResponse(BaseModel):
    items: List[QuestionAdminOut]
    total: int


class CadetSessionListResponse(BaseModel):
    items: List[CadetSessionAdminOut]
    total: int

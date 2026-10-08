from app.models.college import Battalion, College  # noqa: F401
from app.models.cadet import Cadet, WingEnum, GenderEnum  # noqa: F401
from app.models.evaluation import Evaluation, EvaluationCriterion  # noqa: F401
from app.models.mentor import Mentor, ScopeLevelEnum  # noqa: F401
from app.models.user import User, RoleEnum  # noqa: F401
from app.models.ncc_mock_test import (  # noqa: F401
    NCCQuestionTopic,
    NCCQuestion,
    NCCTestSession,
    NCCTestAnswer,
    NCCItemStatistics,
    CertificateLevelEnum,
    WingApplicabilityEnum,
    QuestionDifficultyEnum,
    QuestionStatusEnum,
    NCCTestModeEnum,
    NCCTestStatusEnum,
    NCCTestConfig,
)
from app.models.ops import AttendanceRecord, TrainingTask  # noqa: F401
from app.models.library import StudyMaterial  # noqa: F401

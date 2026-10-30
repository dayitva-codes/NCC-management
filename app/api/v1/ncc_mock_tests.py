import csv
import io
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.models.ncc_mock_test import (
    CertificateLevelEnum,
    NCCQuestion,
    NCCQuestionTopic,
    NCCTestSession,
    QuestionDifficultyEnum,
    QuestionStatusEnum,
    WingApplicabilityEnum,
)
from app.models.user import RoleEnum, User
from app.models.cadet import Cadet
from app.schemas.ncc_mock_test import (
    AnswerSaveRequest,
    AnswerSaveResponse,
    CSVImportResult,
    ItemAnalysisOut,
    QuestionCreateRequest,
    TestSessionCreate,
    TestSessionOut,
    TestSessionResultOut,
    TopicOut,
    NCCTestConfigOut,
    NCCTestConfigUpdate,
    QuestionAdminOut,
    QuestionAdminUpdate,
    QuestionListResponse,
    TopicAdminCreate,
    TopicAdminUpdate,
    CadetSessionAdminOut,
    CadetSessionListResponse,
)
from app.services import ncc_mock_test_service

router = APIRouter(prefix="/ncc-mock-tests", tags=["ncc-mock-tests"])


@router.get("/topics", response_model=List[TopicOut])
def list_topics(db: Session = Depends(get_db)):
    """Retrieve all 19 NCC syllabus topics and their blueprint weightages."""
    return ncc_mock_test_service.get_all_topics(db)


@router.post("/sessions", response_model=TestSessionOut)
def start_test_session(
    payload: TestSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a server-authoritative mock test session:
    - full_mock: 90 min (100 Q blueprint / balanced distribution)
    - certificate_wise: 45 min (Certificate A, B, or C exam)
    - topic_wise: 30 min (focused topic drill)
    - quick_practice: 20 min (fast sprint)
    - weak_areas: 30 min (spaced repetition resurfacing missed questions)
    """
    return ncc_mock_test_service.start_ncc_session(
        db=db,
        user_id=current_user.id,
        mode=payload.mode,
        cert_level=payload.certificate_level,
        wing=payload.wing,
        topic_code=payload.topic_code,
    )


@router.get("/sessions/{session_id}", response_model=TestSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch session status, remaining seconds, question palette, and saved answers.
    Answers and explanations are shielded until submission.
    """
    return ncc_mock_test_service.get_ncc_session(db, session_id=session_id, user_id=current_user.id)


@router.put("/sessions/{session_id}/answer", response_model=AnswerSaveResponse)
def save_answer(
    session_id: int,
    payload: AnswerSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Progressively save a cadet's selected option or mark-for-review state.
    Locked immediately if server timer has expired.
    """
    return ncc_mock_test_service.save_cadet_answer(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        question_id=payload.question_id,
        selected_option=payload.selected_option,
        is_marked_for_review=payload.is_marked_for_review,
        time_spent_seconds=payload.time_spent_seconds,
    )


@router.post("/sessions/{session_id}/submit", response_model=TestSessionResultOut)
def submit_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Finalize test session, compute score server-side (+1 correct, -0.25 wrong),
    and unlock correct answers, explanations, and psychometrics.
    """
    return ncc_mock_test_service.submit_ncc_session(db, session_id=session_id, user_id=current_user.id)


@router.get("/sessions/{session_id}/results", response_model=TestSessionResultOut)
def get_results(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """(Cadets, Mentors, Admins) Retrieve comprehensive scorecard, topic breakdown, explanations, and cohort average."""
    session = db.query(NCCTestSession).filter(NCCTestSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Examination session not found")

    is_officer = current_user.role in [RoleEnum.admin, RoleEnum.mentor, RoleEnum.co, RoleEnum.co_admin]
    if not is_officer and session.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access to other cadets' scorecards is restricted")

    return ncc_mock_test_service.get_session_results(db, session_id=session_id, user_id=session.user_id)


@router.get("/analytics/cadet/me")
def get_cadet_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve cadet's personal performance dossier, radar scores across 19 topics, and weak areas."""
    return ncc_mock_test_service.get_cadet_analytics(db, user_id=current_user.id)


@router.get("/analytics/item-analysis", response_model=List[ItemAnalysisOut])
def get_item_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    (Mentors/Admins) Psychometric item analysis: Difficulty Index (P),
    Discrimination Index (D), distractor frequencies, and flag alerts.
    """
    if current_user.role not in [RoleEnum.admin, RoleEnum.mentor, RoleEnum.co, RoleEnum.co_admin]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access restricted to Officers and Administrators")
    return ncc_mock_test_service.get_all_item_statistics(db)


@router.post("/questions/import-csv", response_model=CSVImportResult)
def import_questions_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk import questions from CSV with row-level validation:
    Headers required: statement, option_a, option_b, option_c, option_d, correct_option, explanation, topic_code
    """
    if current_user.role not in [RoleEnum.admin, RoleEnum.mentor, RoleEnum.co, RoleEnum.co_admin]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Mentors and Admins can import questions")

    # Read up to 5 MB maximum to prevent memory exhaustion DoS
    raw_bytes = file.file.read(5 * 1024 * 1024 + 1)
    if len(raw_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File exceeds maximum upload size (5 MB)")

    try:
        content = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            content = raw_bytes.decode("latin-1")
        except Exception:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is not a valid UTF-8 text file")

    reader = csv.DictReader(io.StringIO(content))

    valid_topics = {t.code for t in db.query(NCCQuestionTopic).all()}
    imported = 0
    skipped = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        stmt = (row.get("statement") or "").strip()
        opt_a = (row.get("option_a") or "").strip()
        opt_b = (row.get("option_b") or "").strip()
        opt_c = (row.get("option_c") or "").strip()
        opt_d = (row.get("option_d") or "").strip()
        corr_str = (row.get("correct_option") or "").strip().upper()
        expl = (row.get("explanation") or "").strip()
        t_code = (row.get("topic_code") or "").strip().lower()

        # Validation rules
        row_errs = []
        if not stmt:
            row_errs.append("Question statement cannot be empty")
        options = [opt_a, opt_b, opt_c, opt_d]
        if any(not opt for opt in options):
            row_errs.append("All 4 options (A, B, C, D) are required")
        if len(set(options)) < 4:
            row_errs.append("Options must be unique (duplicate options detected)")

        # Convert correct_option to 0-3 index
        correct_idx = None
        if corr_str in ["A", "1", "0"]:
            correct_idx = 0 if corr_str != "1" else 0
        elif corr_str in ["B", "2"]:
            correct_idx = 1
        elif corr_str in ["C", "3"]:
            correct_idx = 2
        elif corr_str in ["D", "4"]:
            correct_idx = 3
        else:
            row_errs.append(f"Invalid correct_option '{corr_str}'. Must be A, B, C, or D (or 1-4)")

        if t_code not in valid_topics:
            row_errs.append(f"Unknown topic_code '{t_code}'. Must match a valid syllabus code")

        if row_errs:
            skipped += 1
            errors.append({"row": row_idx, "statement": stmt[:40], "errors": row_errs})
            continue

        # Add validated question
        q = NCCQuestion(
            statement=stmt,
            options=options,
            correct_option=correct_idx,
            explanation=expl or "Verified handbook answer.",
            topic_code=t_code,
            sub_topic=row.get("sub_topic"),
            certificate_level=CertificateLevelEnum.common,
            wing=WingApplicabilityEnum.common,
            difficulty=QuestionDifficultyEnum.medium,
            source_reference=row.get("source_reference"),
            status=QuestionStatusEnum.approved,
            created_by_id=current_user.id,
            reviewed_by_id=current_user.id,
        )
        db.add(q)
        imported += 1

    db.commit()

    return CSVImportResult(
        total_rows=imported + skipped,
        imported_count=imported,
        skipped_count=skipped,
        errors=errors,
    )


# =========================================================================
# Admin Complete Customization Endpoints
# =========================================================================

@router.get("/config", response_model=NCCTestConfigOut)
def get_mock_test_config(db: Session = Depends(get_db)):
    """Retrieve dynamic NCC mock test configuration (durations, question counts, markings, pass %)."""
    return ncc_mock_test_service.get_or_create_test_config(db)


@router.put("/admin/config", response_model=NCCTestConfigOut)
def update_mock_test_config(
    payload: NCCTestConfigUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Completely customize exam parameters, durations, question counts, markings, and options shuffle."""
    return ncc_mock_test_service.update_test_config(db, payload)


@router.get("/admin/questions", response_model=QuestionListResponse)
def admin_list_questions(
    search: Optional[str] = None,
    topic_code: Optional[str] = None,
    difficulty: Optional[str] = None,
    cert_level: Optional[str] = None,
    wing: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(Admin & Officers) Filter, search, and list all questions with complete metadata and correct answer keys."""
    items, total = ncc_mock_test_service.admin_list_questions(
        db=db,
        search=search,
        topic_code=topic_code,
        difficulty=difficulty,
        cert_level=cert_level,
        wing=wing,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )
    return QuestionListResponse(items=items, total=total)


@router.post("/admin/questions", response_model=QuestionAdminOut)
def admin_create_question(
    payload: QuestionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(Admin & Officers) Add a new MCQ question to the test bank with options, answer key, and handbook explanation."""
    return ncc_mock_test_service.admin_create_question(db=db, payload=payload, user_id=current_user.id)


@router.get("/admin/questions/{question_id}", response_model=QuestionAdminOut)
def admin_get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(Admin & Officers) Inspect a single question in detail."""
    return ncc_mock_test_service.admin_get_question(db=db, question_id=question_id)


@router.put("/admin/questions/{question_id}", response_model=QuestionAdminOut)
def admin_update_question(
    question_id: int,
    payload: QuestionAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(Admin & Officers) Modify statement, options, correct answer key, explanation, topic, or difficulty."""
    return ncc_mock_test_service.admin_update_question(db=db, question_id=question_id, payload=payload)


@router.delete("/admin/questions/{question_id}")
def admin_delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Delete a question from the MCQ test bank."""
    ncc_mock_test_service.admin_delete_question(db=db, question_id=question_id)
    return {"message": "Question deleted successfully"}


@router.post("/admin/topics", response_model=TopicOut)
def admin_create_topic(
    payload: TopicAdminCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Add a new syllabus topic code and default weightage percentage."""
    return ncc_mock_test_service.admin_create_topic(db=db, payload=payload)


@router.put("/admin/topics/{code}", response_model=TopicOut)
def admin_update_topic(
    code: str,
    payload: TopicAdminUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Update topic weightage percentage, display name, or active status."""
    return ncc_mock_test_service.admin_update_topic(db=db, code=code, payload=payload)


@router.delete("/admin/topics/{code}")
def admin_delete_topic(
    code: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Delete or deactivate a syllabus topic."""
    ncc_mock_test_service.admin_delete_topic(db=db, code=code)
    return {"message": "Topic deleted / deactivated successfully"}


@router.get("/admin/sessions", response_model=CadetSessionListResponse)
def admin_list_sessions(
    mode: Optional[str] = None,
    user_id: Optional[int] = None,
    cadet_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(Admin & Officers) View and audit cadet test sessions across battalions with scorecards and timings."""
    items, total = ncc_mock_test_service.admin_list_sessions(
        db=db,
        mode=mode,
        user_id=user_id,
        cadet_id=cadet_id,
        status_filter=status_filter,
        search=search,
        skip=skip,
        limit=limit,
    )
    return CadetSessionListResponse(items=items, total=total)


@router.get("/cadets/{cadet_id}/sessions", response_model=List[CadetSessionAdminOut])
def get_cadet_sessions(
    cadet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """(Officers, Admins, & Examinee) Retrieve all mock test sessions taken by a specific cadet."""
    cadet = db.query(Cadet).filter(Cadet.id == cadet_id).first()
    if not cadet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadet not found")
    is_officer = current_user.role in [RoleEnum.admin, RoleEnum.mentor, RoleEnum.co, RoleEnum.co_admin]
    if not is_officer and cadet.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot inspect another cadet's examination sessions")
    return ncc_mock_test_service.get_cadet_test_sessions(db, cadet_id=cadet_id)


@router.get("/analytics/officer-overview")
def get_officer_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(Officers & Admins) Comprehensive examination metrics across enrolled cadets."""
    return ncc_mock_test_service.get_officer_exam_overview(db)


@router.get("/analytics/cadet/{cadet_id}")
def get_cadet_analytics_by_id(
    cadet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "mentor", "co", "co_admin")),
):
    """(Officers & Admins) Deep-dive analysis for an individual cadet."""
    return ncc_mock_test_service.get_cadet_analytics_by_cadet_id(db, cadet_id=cadet_id)



@router.delete("/admin/sessions/{session_id}")
def admin_delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin", "co", "co_admin")),
):
    """(Admin) Reset or purge a cadet's test attempt."""
    ncc_mock_test_service.admin_delete_session(db=db, session_id=session_id)
    return {"message": "Session removed / attempt reset"}

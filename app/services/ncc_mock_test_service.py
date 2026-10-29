import json
from datetime import datetime, timedelta
import random
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.ncc_mock_test import (
    CertificateLevelEnum,
    NCCItemStatistics,
    NCCQuestion,
    NCCQuestionTopic,
    NCCTestAnswer,
    NCCTestConfig,
    NCCTestModeEnum,
    NCCTestSession,
    NCCTestStatusEnum,
    QuestionStatusEnum,
    WingApplicabilityEnum,
)
from app.models.user import User
from app.models.cadet import Cadet
from app.models.college import College
from app.schemas.ncc_mock_test import (
    AnswerSaveResponse,
    CadetSessionAdminOut,
    ItemAnalysisOut,
    NCCTestConfigOut,
    NCCTestConfigUpdate,
    QuestionAdminOut,
    QuestionAdminUpdate,
    QuestionCreateRequest,
    QuestionInSessionOut,
    QuestionReviewOut,
    SavedAnswerItem,
    TestSessionOut,
    TestSessionResultOut,
    TopicAdminCreate,
    TopicAdminUpdate,
    TopicBreakdownItem,
    TopicOut,
)
from app.services.ncc_seed_data import seed_ncc_topics_and_questions


def _enum_val(val: Any, default: str = "") -> str:
    """Safely extract string value from Enum or plain string."""
    if val is None:
        return default
    if hasattr(val, "value"):
        return str(val.value)
    return str(val)


def _parse_json_list(val: Any) -> list:
    """Safely parse a list or JSON serialized string to list."""
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


def _parse_json_dict(val: Any) -> dict:
    """Safely parse a dict or JSON serialized string to dict."""
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {}


def get_all_topics(db: Session) -> List[TopicOut]:
    try:
        from app.db.session import ensure_db_ready
        ensure_db_ready()
    except Exception:
        pass

    try:
        seed_ncc_topics_and_questions(db)
    except Exception:
        db.rollback()

    topics = db.query(NCCQuestionTopic).filter(NCCQuestionTopic.is_active.is_(True)).all()
    res = []
    for t in topics:
        q_count = db.query(NCCQuestion).filter(
            NCCQuestion.topic_code == t.code,
            NCCQuestion.status.in_([QuestionStatusEnum.approved, "approved"]),
        ).count()
        res.append(
            TopicOut(
                id=t.id,
                code=t.code,
                name=t.name,
                default_weightage=t.default_weightage or 5.0,
                is_active=bool(t.is_active),
                question_count=q_count,
            )
        )
    return res


def select_blueprint_questions(
    db: Session,
    user_id: int,
    mode: NCCTestModeEnum,
    target_count: int,
    cert_level: Optional[CertificateLevelEnum] = None,
    wing: Optional[WingApplicabilityEnum] = None,
    topic_code: Optional[str] = None,
) -> List[NCCQuestion]:
    """Select questions matching blueprint criteria with anti-repeat preference."""
    try:
        seed_ncc_topics_and_questions(db)
    except Exception:
        db.rollback()

    query = db.query(NCCQuestion).filter(NCCQuestion.status.in_([QuestionStatusEnum.approved, "approved"]))

    if topic_code:
        query = query.filter(NCCQuestion.topic_code == topic_code)

    cert_str = _enum_val(cert_level)
    if cert_str and cert_str != "common":
        query = query.filter(
            NCCQuestion.certificate_level.in_([cert_str, CertificateLevelEnum.common.value, "common"])
        )

    wing_str = _enum_val(wing)
    if wing_str and wing_str != "common":
        query = query.filter(
            NCCQuestion.wing.in_([wing_str, WingApplicabilityEnum.common.value, "common"])
        )

    available = query.all()
    if not available:
        # Fallback to any approved questions
        available = db.query(NCCQuestion).filter(NCCQuestion.status.in_([QuestionStatusEnum.approved, "approved"])).all()

    if not available:
        available = db.query(NCCQuestion).all()

    if not available:
        # Emergency auto-seed if question bank is currently empty
        try:
            seed_ncc_topics_and_questions(db)
            available = db.query(NCCQuestion).all()
        except Exception:
            db.rollback()

    if not available:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No questions found matching criteria")

    # If weak areas mode: prioritize topics where cadet had wrong answers
    mode_str = _enum_val(mode)
    if mode == NCCTestModeEnum.weak_areas or mode_str == "weak_areas":
        wrong_answers = (
            db.query(NCCTestAnswer)
            .join(NCCTestSession, NCCTestAnswer.session_id == NCCTestSession.id)
            .filter(NCCTestSession.user_id == user_id, NCCTestAnswer.is_correct.is_(False))
            .all()
        )
        missed_qids = {a.question_id for a in wrong_answers}
        weak_qs = [q for q in available if q.id in missed_qids]
        other_qs = [q for q in available if q.id not in missed_qids]
        combined = weak_qs + other_qs
        return combined[:target_count]

    # Otherwise shuffle and pick blueprint target_count
    shuffled = list(available)
    random.shuffle(shuffled)
    return shuffled[:target_count]


def get_or_create_test_config(db: Session) -> NCCTestConfig:
    try:
        cfg = db.query(NCCTestConfig).first()
    except Exception:
        db.rollback()
        try:
            from app.db.base import Base
            from app.db.session import engine
            import app.models  # noqa: F401
            Base.metadata.create_all(bind=engine)
            cfg = db.query(NCCTestConfig).first()
        except Exception:
            db.rollback()
            cfg = None

    if not cfg:
        cfg = NCCTestConfig(
            full_mock_duration_minutes=90,
            full_mock_question_count=40,
            cert_exam_duration_minutes=45,
            cert_exam_question_count=30,
            quick_practice_duration_minutes=20,
            quick_practice_question_count=20,
            marks_per_correct=1.0,
            marks_per_wrong=-0.25,
            shuffle_options=True,
            pass_percentage=45.0,
        )
        db.add(cfg)
        try:
            db.commit()
            db.refresh(cfg)
        except Exception:
            db.rollback()
            cfg = db.query(NCCTestConfig).first()
    return cfg


def update_test_config(db: Session, payload: NCCTestConfigUpdate) -> NCCTestConfig:
    cfg = get_or_create_test_config(db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(cfg, field, val)
    cfg.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cfg)
    return cfg


def start_ncc_session(
    db: Session,
    user_id: int,
    mode: NCCTestModeEnum,
    cert_level: Optional[CertificateLevelEnum] = None,
    wing: Optional[WingApplicabilityEnum] = None,
    topic_code: Optional[str] = None,
) -> TestSessionOut:
    try:
        from app.db.session import ensure_db_ready
        ensure_db_ready()
    except Exception:
        pass

    try:
        seed_ncc_topics_and_questions(db)
    except Exception:
        db.rollback()

    cfg = get_or_create_test_config(db)

    mode_str = _enum_val(mode, "quick_practice")
    # Determine duration and question count by mode
    if mode == NCCTestModeEnum.full_mock or mode_str == "full_mock":
        duration_seconds = (cfg.full_mock_duration_minutes or 90) * 60
        target_count = cfg.full_mock_question_count or 40
        title = "NCC Full Certificate Mock Examination (Syllabus Blueprint)"
    elif mode == NCCTestModeEnum.certificate_wise or mode_str == "certificate_wise":
        duration_seconds = (cfg.cert_exam_duration_minutes or 45) * 60
        target_count = cfg.cert_exam_question_count or 30
        c_name = _enum_val(cert_level, "B")
        title = f"NCC Certificate {c_name} Exam Practice"
    elif mode == NCCTestModeEnum.topic_wise or mode_str == "topic_wise":
        duration_seconds = 1800  # 30 minutes
        target_count = 15
        topic_obj = db.query(NCCQuestionTopic).filter(NCCQuestionTopic.code == topic_code).first() if topic_code else None
        title = f"Topic Drill: {topic_obj.name if topic_obj else (topic_code or 'General')}"
    elif mode == NCCTestModeEnum.weak_areas or mode_str == "weak_areas":
        duration_seconds = 1800  # 30 minutes
        target_count = 15
        title = "Personalized Weak Areas & Re-test Drill"
    else:  # quick_practice
        duration_seconds = (cfg.quick_practice_duration_minutes or 20) * 60
        target_count = cfg.quick_practice_question_count or 20
        title = "Quick 20-Min NCC Practice Sprint"

    questions = select_blueprint_questions(
        db=db,
        user_id=user_id,
        mode=mode,
        target_count=target_count,
        cert_level=cert_level,
        wing=wing,
        topic_code=topic_code,
    )

    q_ids = [q.id for q in questions]

    # Generate option orders per question for this session
    option_orders = {}
    for q in questions:
        q_opts = _parse_json_list(q.options)
        perm = list(range(len(q_opts))) if len(q_opts) > 0 else [0, 1, 2, 3]
        if cfg.shuffle_options:
            random.shuffle(perm)
        option_orders[str(q.id)] = perm

    now = datetime.utcnow()
    end_time = now + timedelta(seconds=duration_seconds)

    session = NCCTestSession(
        user_id=user_id,
        mode=mode_str,
        title=title,
        certificate_level=_enum_val(cert_level, "") or None,
        wing=_enum_val(wing, "") or None,
        topic_filter=topic_code,
        question_ids=q_ids,
        option_orders=option_orders,
        marks_per_correct=cfg.marks_per_correct if cfg.marks_per_correct is not None else 1.0,
        marks_per_wrong=cfg.marks_per_wrong if cfg.marks_per_wrong is not None else -0.25,
        start_time=now,
        end_time=end_time,
        duration_seconds=duration_seconds,
        status="in_progress",
    )
    db.add(session)
    try:
        db.commit()
        db.refresh(session)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record examination session in database: {str(exc)}",
        )

    return get_ncc_session(db, session.id, user_id)


def get_ncc_session(db: Session, session_id: int, user_id: int) -> TestSessionOut:
    session = db.query(NCCTestSession).filter(NCCTestSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test session not found")

    now = datetime.utcnow()
    # Check if timer has expired; auto-submit if in_progress
    if session.status == NCCTestStatusEnum.in_progress and now > session.end_time:
        try:
            submit_ncc_session(db, session.id, user_id)
            db.refresh(session)
        except Exception as e:
            print(f"Auto-submit warning: {e}")

    remaining_seconds = max(0, int((session.end_time - now).total_seconds()))

    # Fetch questions in session order
    q_ids = _parse_json_list(session.question_ids)
    questions_map = {
        q.id: q for q in db.query(NCCQuestion).filter(NCCQuestion.id.in_(q_ids)).all()
    } if q_ids else {}

    # Fetch saved answers for this session
    saved_answers = db.query(NCCTestAnswer).filter(NCCTestAnswer.session_id == session.id).all()
    ans_map = {
        str(a.question_id): SavedAnswerItem(
            selected_option=a.selected_option,
            is_marked_for_review=bool(a.is_marked_for_review),
            time_spent_seconds=a.time_spent_seconds or 0,
        )
        for a in saved_answers
    }

    # Prepare questions with shuffled options without leaking answer keys
    questions_out = []
    option_orders = _parse_json_dict(session.option_orders)

    for qid in q_ids:
        q = questions_map.get(qid)
        if not q:
            continue
        q_opts = _parse_json_list(q.options)
        perm = option_orders.get(str(qid))
        if not perm or not isinstance(perm, list):
            perm = list(range(len(q_opts))) if len(q_opts) > 0 else [0, 1, 2, 3]

        # Reorder options as per permutation safely
        shuffled_options = [q_opts[orig_idx] for orig_idx in perm if orig_idx < len(q_opts)]
        if not shuffled_options:
            shuffled_options = q_opts

        questions_out.append(
            QuestionInSessionOut(
                id=q.id,
                statement=q.statement,
                options=shuffled_options,
                topic_code=q.topic_code,
                sub_topic=q.sub_topic,
                certificate_level=_enum_val(q.certificate_level, "common"),
                wing=_enum_val(q.wing, "common"),
                difficulty=_enum_val(q.difficulty, "medium"),
            )
        )

    return TestSessionOut(
        id=session.id,
        mode=_enum_val(session.mode, "quick_practice"),
        title=session.title,
        certificate_level=session.certificate_level,
        wing=session.wing,
        topic_filter=session.topic_filter,
        duration_seconds=session.duration_seconds or 0,
        remaining_seconds=remaining_seconds,
        start_time=session.start_time,
        end_time=session.end_time,
        status=_enum_val(session.status, "in_progress"),
        marks_per_correct=session.marks_per_correct if session.marks_per_correct is not None else 1.0,
        marks_per_wrong=session.marks_per_wrong if session.marks_per_wrong is not None else -0.25,
        total_questions=len(questions_out),
        questions=questions_out,
        saved_answers=ans_map,
    )


def save_cadet_answer(
    db: Session,
    session_id: int,
    user_id: int,
    question_id: int,
    selected_option: Optional[int],
    is_marked_for_review: bool = False,
    time_spent_seconds: int = 0,
) -> AnswerSaveResponse:
    session = db.query(NCCTestSession).filter(NCCTestSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    now = datetime.utcnow()
    # Reject late answer submissions past end_time
    if now > session.end_time or session.status != NCCTestStatusEnum.in_progress:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Test time has expired. Further answer submissions are locked."
        )

    # Map shuffled selected_option (0-3) back to actual question option index
    option_orders = _parse_json_dict(session.option_orders)
    perm = option_orders.get(str(question_id), [0, 1, 2, 3])
    actual_idx = None
    if selected_option is not None and 0 <= selected_option < len(perm):
        actual_idx = perm[selected_option]

    ans = (
        db.query(NCCTestAnswer)
        .filter(NCCTestAnswer.session_id == session.id, NCCTestAnswer.question_id == question_id)
        .first()
    )

    if not ans:
        ans = NCCTestAnswer(
            session_id=session.id,
            question_id=question_id,
            selected_option=selected_option,
            actual_option_index=actual_idx,
            is_marked_for_review=bool(is_marked_for_review),
            time_spent_seconds=time_spent_seconds or 0,
        )
        db.add(ans)
    else:
        ans.selected_option = selected_option
        ans.actual_option_index = actual_idx
        ans.is_marked_for_review = bool(is_marked_for_review)
        ans.time_spent_seconds = time_spent_seconds or 0
        ans.updated_at = now

    db.commit()

    return AnswerSaveResponse(
        success=True,
        question_id=question_id,
        selected_option=selected_option,
        is_marked_for_review=bool(is_marked_for_review),
        server_time=now,
    )


def submit_ncc_session(db: Session, session_id: int, user_id: int) -> TestSessionResultOut:
    session = db.query(NCCTestSession).filter(NCCTestSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    q_ids = _parse_json_list(session.question_ids)
    questions = db.query(NCCQuestion).filter(NCCQuestion.id.in_(q_ids)).all() if q_ids else []
    q_map = {q.id: q for q in questions}

    answers = db.query(NCCTestAnswer).filter(NCCTestAnswer.session_id == session.id).all()
    ans_map = {a.question_id: a for a in answers}

    correct_count = 0
    wrong_count = 0
    unanswered_count = 0
    total_score = 0.0
    total_time = 0

    marks_correct = session.marks_per_correct if session.marks_per_correct is not None else 1.0
    marks_wrong = session.marks_per_wrong if session.marks_per_wrong is not None else -0.25

    # Score each question server-side
    for qid in q_ids:
        q = q_map.get(qid)
        if not q:
            continue
        ans = ans_map.get(qid)
        time_spent = ans.time_spent_seconds if (ans and ans.time_spent_seconds) else 0
        total_time += time_spent

        if ans and ans.actual_option_index is not None:
            if ans.actual_option_index == q.correct_option:
                ans.is_correct = True
                ans.marks_awarded = marks_correct
                correct_count += 1
                total_score += marks_correct
            else:
                ans.is_correct = False
                ans.marks_awarded = marks_wrong
                wrong_count += 1
                total_score += marks_wrong
        else:
            if not ans:
                ans = NCCTestAnswer(
                    session_id=session.id,
                    question_id=qid,
                    selected_option=None,
                    actual_option_index=None,
                    is_correct=None,
                    marks_awarded=0.0,
                )
                db.add(ans)
            else:
                ans.is_correct = None
                ans.marks_awarded = 0.0
            unanswered_count += 1

    attempted = correct_count + wrong_count
    accuracy = round((correct_count / attempted * 100.0), 2) if attempted > 0 else 0.0

    session.status = NCCTestStatusEnum.completed
    session.total_score = round(max(0.0, total_score), 2)
    session.total_correct = correct_count
    session.total_wrong = wrong_count
    session.total_unanswered = unanswered_count
    session.accuracy_percentage = accuracy
    session.time_spent_seconds = total_time
    db.commit()

    # Recompute psychometrics for questions in this session
    try:
        recompute_item_statistics(db, q_ids)
    except Exception as e:
        print(f"Item statistics update warning: {e}")

    return get_session_results(db, session.id, user_id)


def get_session_results(db: Session, session_id: int, user_id: int) -> TestSessionResultOut:
    session = db.query(NCCTestSession).filter(NCCTestSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    q_ids = _parse_json_list(session.question_ids)
    questions = db.query(NCCQuestion).filter(NCCQuestion.id.in_(q_ids)).all() if q_ids else []
    q_map = {q.id: q for q in questions}

    answers = db.query(NCCTestAnswer).filter(NCCTestAnswer.session_id == session.id).all()
    ans_map = {a.question_id: a for a in answers}

    option_orders = _parse_json_dict(session.option_orders)
    questions_review = []
    topic_aggregates = {}

    marks_correct = session.marks_per_correct if session.marks_per_correct is not None else 1.0
    marks_wrong = session.marks_per_wrong if session.marks_per_wrong is not None else -0.25

    for qid in q_ids:
        q = q_map.get(qid)
        if not q:
            continue
        ans = ans_map.get(qid)
        q_opts = _parse_json_list(q.options)
        perm = option_orders.get(str(qid))
        if not perm or not isinstance(perm, list):
            perm = list(range(len(q_opts))) if len(q_opts) > 0 else [0, 1, 2, 3]

        shuffled_options = [q_opts[idx] for idx in perm if idx < len(q_opts)]
        if not shuffled_options:
            shuffled_options = q_opts

        # Find which shuffled option index matches correct_option
        correct_shuffled_idx = perm.index(q.correct_option) if (q.correct_option is not None and q.correct_option in perm) else (q.correct_option or 0)

        review_item = QuestionReviewOut(
            id=q.id,
            statement=q.statement,
            options=shuffled_options,
            selected_option=ans.selected_option if ans else None,
            actual_option_index=ans.actual_option_index if ans else None,
            correct_option=correct_shuffled_idx,
            is_correct=ans.is_correct if ans else None,
            is_marked_for_review=bool(ans.is_marked_for_review) if ans else False,
            marks_awarded=ans.marks_awarded if (ans and ans.marks_awarded is not None) else 0.0,
            explanation=q.explanation or "Official NCC Handbook reference answer.",
            source_reference=q.source_reference,
            time_spent_seconds=ans.time_spent_seconds if (ans and ans.time_spent_seconds) else 0,
            topic_code=q.topic_code,
            sub_topic=q.sub_topic,
        )
        questions_review.append(review_item)

        # Aggregate by topic
        t_code = q.topic_code or "general"
        if t_code not in topic_aggregates:
            topic_aggregates[t_code] = {
                "total": 0, "correct": 0, "wrong": 0, "unanswered": 0, "marks": 0.0
            }
        topic_aggregates[t_code]["total"] += 1
        if ans and ans.is_correct is True:
            topic_aggregates[t_code]["correct"] += 1
            topic_aggregates[t_code]["marks"] += marks_correct
        elif ans and ans.is_correct is False:
            topic_aggregates[t_code]["wrong"] += 1
            topic_aggregates[t_code]["marks"] += marks_wrong
        else:
            topic_aggregates[t_code]["unanswered"] += 1

    # Topic breakdown
    topics = db.query(NCCQuestionTopic).all()
    t_name_map = {t.code: t.name for t in topics}

    breakdown = []
    for t_code, stats_dict in topic_aggregates.items():
        att = stats_dict["correct"] + stats_dict["wrong"]
        acc = round(stats_dict["correct"] / att * 100.0, 1) if att > 0 else 0.0
        breakdown.append(
            TopicBreakdownItem(
                topic_code=t_code,
                topic_name=t_name_map.get(t_code, t_code),
                total_questions=stats_dict["total"],
                correct=stats_dict["correct"],
                wrong=stats_dict["wrong"],
                unanswered=stats_dict["unanswered"],
                accuracy=acc,
                marks_obtained=round(stats_dict["marks"], 2),
            )
        )

    # Cohort average
    avg_score = db.query(func.avg(NCCTestSession.total_score)).filter(
        NCCTestSession.status == NCCTestStatusEnum.completed
    ).scalar()

    user = db.query(User).filter(User.id == session.user_id).first()
    cadet = db.query(Cadet).filter(Cadet.user_id == session.user_id).first() if user else None
    college_name = cadet.college.name if (cadet and cadet.college) else None
    battalion_name = cadet.college.battalion.name if (cadet and cadet.college and cadet.college.battalion) else None

    return TestSessionResultOut(
        session_id=session.id,
        user_id=session.user_id,
        user_name=cadet.full_name if cadet else (user.email if user else "Cadet"),
        cadet_name=cadet.full_name if cadet else None,
        cadet_regimental_number=cadet.enrollment_number if cadet else None,
        cadet_rank=cadet.rank if cadet else "CDT",
        college_name=college_name,
        battalion_name=battalion_name,
        title=session.title,
        mode=session.mode,
        status=session.status,
        total_questions=len(q_ids),
        total_correct=session.total_correct or 0,
        total_wrong=session.total_wrong or 0,
        total_unanswered=session.total_unanswered or 0,
        total_score=session.total_score or 0.0,
        max_possible_score=float(len(q_ids) * marks_correct),
        accuracy_percentage=session.accuracy_percentage or 0.0,
        time_spent_seconds=session.time_spent_seconds or 0,
        cohort_average_score=round(float(avg_score), 2) if avg_score is not None else None,
        topic_breakdown=breakdown,
        questions_review=questions_review,
    )


def recompute_item_statistics(db: Session, question_ids: List[int]):
    """Recomputes Difficulty (P), Discrimination (D), and Distractor Analysis for given questions."""
    for qid in question_ids:
        q = db.query(NCCQuestion).filter(NCCQuestion.id == qid).first()
        if not q:
            continue

        answers = db.query(NCCTestAnswer).filter(
            NCCTestAnswer.question_id == qid,
            NCCTestAnswer.actual_option_index.isnot(None),
        ).all()

        total_attempts = len(answers)
        if total_attempts == 0:
            continue

        correct_attempts = sum(1 for a in answers if a.is_correct is True)
        p_index = round(correct_attempts / total_attempts, 3) if total_attempts > 0 else 0.0

        # Distractor counts
        dist_counts = {"0": 0, "1": 0, "2": 0, "3": 0}
        total_time = 0
        for a in answers:
            if a.actual_option_index is not None and 0 <= a.actual_option_index <= 3:
                dist_counts[str(a.actual_option_index)] = dist_counts.get(str(a.actual_option_index), 0) + 1
            total_time += a.time_spent_seconds or 0

        avg_time = round(total_time / total_attempts, 1) if total_attempts > 0 else 0.0

        # Discrimination Index (D): top 27% vs bottom 27%
        sessions = (
            db.query(NCCTestSession)
            .join(NCCTestAnswer, NCCTestSession.id == NCCTestAnswer.session_id)
            .filter(NCCTestAnswer.question_id == qid, NCCTestSession.total_score.isnot(None))
            .order_by(NCCTestSession.total_score.desc())
            .all()
        )

        d_index = 0.0
        if len(sessions) >= 4:
            k = max(1, int(len(sessions) * 0.27))
            upper_sess_ids = {s.id for s in sessions[:k]}
            lower_sess_ids = {s.id for s in sessions[-k:]}

            upper_correct = sum(1 for a in answers if a.session_id in upper_sess_ids and a.is_correct is True)
            lower_correct = sum(1 for a in answers if a.session_id in lower_sess_ids and a.is_correct is True)

            p_u = upper_correct / len(upper_sess_ids) if upper_sess_ids else 0.0
            p_l = lower_correct / len(lower_sess_ids) if lower_sess_ids else 0.0
            d_index = round(p_u - p_l, 3)

        # Determine flag status
        flag = "ok"
        if p_index < 0.20:
            flag = "too_hard"
        elif p_index > 0.85:
            flag = "too_easy"
        elif d_index < 0.0:
            flag = "negative_discrimination"
        else:
            # Check if any distractor was chosen more often than the correct key
            correct_key_str = str(q.correct_option)
            key_picks = dist_counts.get(correct_key_str, 0)
            for opt, cnt in dist_counts.items():
                if opt != correct_key_str and cnt > key_picks and total_attempts >= 5:
                    flag = "ambiguous_key"
                    break

        stat = db.query(NCCItemStatistics).filter(NCCItemStatistics.question_id == qid).first()
        if not stat:
            stat = NCCItemStatistics(
                question_id=qid,
                total_attempts=total_attempts,
                total_correct=correct_attempts,
                difficulty_index_p=p_index,
                discrimination_index_d=d_index,
                distractor_counts=dist_counts,
                average_time_seconds=avg_time,
                flag_status=flag,
                last_recomputed_at=datetime.utcnow(),
            )
            db.add(stat)
        else:
            stat.total_attempts = total_attempts
            stat.total_correct = correct_attempts
            stat.difficulty_index_p = p_index
            stat.discrimination_index_d = d_index
            stat.distractor_counts = dist_counts
            stat.average_time_seconds = avg_time
            stat.flag_status = flag
            stat.last_recomputed_at = datetime.utcnow()

    db.commit()


def get_all_item_statistics(db: Session) -> List[ItemAnalysisOut]:
    try:
        seed_ncc_topics_and_questions(db)
    except Exception:
        pass
    questions = db.query(NCCQuestion).all()
    q_ids = [q.id for q in questions]
    try:
        recompute_item_statistics(db, q_ids)
    except Exception as e:
        print(f"Item stats recompute warning: {e}")

    stats = db.query(NCCItemStatistics).all()
    s_map = {s.question_id: s for s in stats}

    res = []
    for q in questions:
        st = s_map.get(q.id)
        res.append(
            ItemAnalysisOut(
                question_id=q.id,
                statement=q.statement,
                topic_code=q.topic_code,
                certificate_level=_enum_val(q.certificate_level, "common"),
                wing=_enum_val(q.wing, "common"),
                difficulty=_enum_val(q.difficulty, "medium"),
                total_attempts=st.total_attempts if st else 0,
                total_correct=st.total_correct if st else 0,
                difficulty_index_p=st.difficulty_index_p if st else 0.0,
                discrimination_index_d=st.discrimination_index_d if st else 0.0,
                distractor_counts=st.distractor_counts if st else {"0": 0, "1": 0, "2": 0, "3": 0},
                average_time_seconds=st.average_time_seconds if st else 0.0,
                flag_status=st.flag_status if st else "ok",
            )
        )
    return res


def get_cadet_analytics(db: Session, user_id: int) -> Dict[str, Any]:
    sessions = (
        db.query(NCCTestSession)
        .filter(NCCTestSession.user_id == user_id, NCCTestSession.status == NCCTestStatusEnum.completed)
        .order_by(NCCTestSession.created_at.asc())
        .all()
    )

    if not sessions:
        return {
            "tests_completed": 0,
            "overall_accuracy": 0.0,
            "total_questions_answered": 0,
            "strong_topics": [],
            "weak_topics": [],
            "radar_data": [],
            "history": [],
        }

    total_correct = sum((s.total_correct or 0) for s in sessions)
    total_wrong = sum((s.total_wrong or 0) for s in sessions)
    total_att = total_correct + total_wrong
    overall_acc = round(total_correct / total_att * 100.0, 1) if total_att > 0 else 0.0


    # Topic accuracy
    answers = (
        db.query(NCCTestAnswer, NCCQuestion.topic_code)
        .join(NCCQuestion, NCCTestAnswer.question_id == NCCQuestion.id)
        .join(NCCTestSession, NCCTestAnswer.session_id == NCCTestSession.id)
        .filter(NCCTestSession.user_id == user_id, NCCTestAnswer.actual_option_index.isnot(None))
        .all()
    )

    topic_counts = {}
    for ans, t_code in answers:
        if t_code not in topic_counts:
            topic_counts[t_code] = {"correct": 0, "total": 0}
        topic_counts[t_code]["total"] += 1
        if ans.is_correct is True:
            topic_counts[t_code]["correct"] += 1

    topics = db.query(NCCQuestionTopic).all()
    t_name_map = {t.code: t.name for t in topics}

    radar = []
    for t_code, counts in topic_counts.items():
        acc = round(counts["correct"] / counts["total"] * 100.0, 1) if counts["total"] > 0 else 0.0
        radar.append({
            "topic_code": t_code,
            "topic_name": t_name_map.get(t_code, t_code),
            "accuracy": acc,
            "attempts": counts["total"],
        })

    # Sort to determine weak (< 50%) and strong (>= 75%)
    radar.sort(key=lambda x: x["accuracy"])
    weak = [r for r in radar if r["accuracy"] < 50.0]
    strong = [r for r in radar if r["accuracy"] >= 75.0]

    return {
        "tests_completed": len(sessions),
        "overall_accuracy": overall_acc,
        "total_questions_answered": total_att,
        "strong_topics": strong,
        "weak_topics": weak,
        "radar_data": radar,
        "history": [
            {
                "id": s.id,
                "title": s.title,
                "mode": _enum_val(s.mode, "quick_practice"),
                "score": s.total_score or 0.0,
                "accuracy": s.accuracy_percentage or 0.0,
                "created_at": s.created_at.isoformat() if hasattr(s.created_at, "isoformat") else str(s.created_at or ""),
            }
            for s in sessions
        ],
    }


# =========================================================================
# Complete Admin Customization & Operations Layer
# =========================================================================

def admin_list_questions(
    db: Session,
    search: Optional[str] = None,
    topic_code: Optional[str] = None,
    difficulty: Optional[str] = None,
    cert_level: Optional[str] = None,
    wing: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[List[NCCQuestion], int]:
    seed_ncc_topics_and_questions(db)
    q = db.query(NCCQuestion)
    if search:
        s_term = f"%{search.strip()}%"
        q = q.filter(NCCQuestion.statement.ilike(s_term) | NCCQuestion.explanation.ilike(s_term))
    if topic_code:
        q = q.filter(NCCQuestion.topic_code == topic_code)
    if difficulty:
        q = q.filter(NCCQuestion.difficulty == difficulty)
    if cert_level:
        q = q.filter(NCCQuestion.certificate_level == cert_level)
    if wing:
        q = q.filter(NCCQuestion.wing == wing)
    if status_filter:
        q = q.filter(NCCQuestion.status == status_filter)

    total = q.count()
    items = q.order_by(NCCQuestion.id.desc()).offset(skip).limit(limit).all()
    return items, total


def admin_create_question(db: Session, payload: QuestionCreateRequest, user_id: Optional[int] = None) -> NCCQuestion:
    seed_ncc_topics_and_questions(db)
    topic = db.query(NCCQuestionTopic).filter(NCCQuestionTopic.code == payload.topic_code).first()
    if not topic:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Topic '{payload.topic_code}' does not exist")
    if len(payload.options) != 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Exactly 4 options are required")
    if not (0 <= payload.correct_option <= 3):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "correct_option must be between 0 and 3")

    q = NCCQuestion(
        statement=payload.statement.strip(),
        options=[opt.strip() for opt in payload.options],
        correct_option=payload.correct_option,
        explanation=payload.explanation.strip(),
        topic_code=payload.topic_code,
        sub_topic=payload.sub_topic,
        certificate_level=payload.certificate_level,
        wing=payload.wing,
        difficulty=payload.difficulty,
        source_reference=payload.source_reference,
        status=QuestionStatusEnum.approved,
        created_by_id=user_id,
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    # Initialize item statistics
    stat = NCCItemStatistics(question_id=q.id)
    db.add(stat)
    db.commit()
    return q


def admin_get_question(db: Session, question_id: int) -> NCCQuestion:
    q = db.query(NCCQuestion).filter(NCCQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return q


def admin_update_question(db: Session, question_id: int, payload: QuestionAdminUpdate) -> NCCQuestion:
    q = admin_get_question(db, question_id)
    if payload.options is not None:
        if len(payload.options) != 4:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Exactly 4 options are required")
        q.options = [opt.strip() for opt in payload.options]
    if payload.correct_option is not None:
        if not (0 <= payload.correct_option <= 3):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "correct_option must be between 0 and 3")
        q.correct_option = payload.correct_option
    if payload.topic_code is not None:
        topic = db.query(NCCQuestionTopic).filter(NCCQuestionTopic.code == payload.topic_code).first()
        if not topic:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Topic '{payload.topic_code}' does not exist")
        q.topic_code = payload.topic_code

    for field in ["statement", "explanation", "sub_topic", "certificate_level", "wing", "difficulty", "source_reference", "status"]:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(q, field, val)

    q.version = (q.version or 1) + 1
    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return q


def admin_delete_question(db: Session, question_id: int) -> bool:
    q = admin_get_question(db, question_id)
    db.query(NCCTestAnswer).filter(NCCTestAnswer.question_id == question_id).delete(synchronize_session=False)
    db.query(NCCItemStatistics).filter(NCCItemStatistics.question_id == question_id).delete(synchronize_session=False)
    db.delete(q)
    db.commit()
    return True


def admin_create_topic(db: Session, payload: TopicAdminCreate) -> NCCQuestionTopic:
    code = payload.code.strip().lower()
    existing = db.query(NCCQuestionTopic).filter(NCCQuestionTopic.code == code).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Topic code '{code}' already exists")
    t = NCCQuestionTopic(
        code=code,
        name=payload.name.strip(),
        default_weightage=payload.default_weightage,
        is_active=payload.is_active,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def admin_update_topic(db: Session, code: str, payload: TopicAdminUpdate) -> NCCQuestionTopic:
    t = db.query(NCCQuestionTopic).filter(NCCQuestionTopic.code == code).first()
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Topic '{code}' not found")
    if payload.name is not None:
        t.name = payload.name.strip()
    if payload.default_weightage is not None:
        t.default_weightage = payload.default_weightage
    if payload.is_active is not None:
        t.is_active = payload.is_active
    db.commit()
    db.refresh(t)
    return t


def admin_delete_topic(db: Session, code: str) -> bool:
    t = db.query(NCCQuestionTopic).filter(NCCQuestionTopic.code == code).first()
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Topic '{code}' not found")
    q_count = db.query(NCCQuestion).filter(NCCQuestion.topic_code == code).count()
    if q_count > 0:
        t.is_active = False
        db.commit()
    else:
        db.delete(t)
        db.commit()
    return True


def admin_list_sessions(
    db: Session,
    mode: Optional[str] = None,
    user_id: Optional[int] = None,
    cadet_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[List[CadetSessionAdminOut], int]:
    q = db.query(NCCTestSession)
    if mode:
        q = q.filter(NCCTestSession.mode == mode)
    if user_id:
        q = q.filter(NCCTestSession.user_id == user_id)
    if cadet_id:
        c = db.query(Cadet).filter(Cadet.id == cadet_id).first()
        if c:
            q = q.filter(NCCTestSession.user_id == c.user_id)
        else:
            return [], 0
    if status_filter:
        q = q.filter(NCCTestSession.status == status_filter)

    if search:
        s_term = f"%{search.strip().lower()}%"
        matching_users = db.query(User.id).filter(func.lower(User.email).like(s_term)).all()
        user_ids_from_users = [u[0] for u in matching_users]

        matching_cadets = db.query(Cadet.user_id).filter(
            (func.lower(Cadet.full_name).like(s_term)) |
            (func.lower(Cadet.enrollment_number).like(s_term))
        ).all()
        user_ids_from_cadets = [c[0] for c in matching_cadets]

        combined_uids = list(set(user_ids_from_users + user_ids_from_cadets))
        if combined_uids:
            q = q.filter(
                (NCCTestSession.user_id.in_(combined_uids)) |
                (func.lower(NCCTestSession.title).like(s_term))
            )
        else:
            q = q.filter(func.lower(NCCTestSession.title).like(s_term))

    total = q.count()
    sessions = q.order_by(NCCTestSession.id.desc()).offset(skip).limit(limit).all()

    res = []
    for s in sessions:
        user = db.query(User).filter(User.id == s.user_id).first()
        cadet = db.query(Cadet).filter(Cadet.user_id == s.user_id).first() if user else None
        college = db.query(College).filter(College.id == cadet.college_id).first() if (cadet and cadet.college_id) else None
        res.append(
            CadetSessionAdminOut(
                id=s.id,
                user_id=s.user_id,
                cadet_id=cadet.id if cadet else None,
                user_name=cadet.full_name if cadet else (user.email if user else "Unknown"),
                user_email=user.email if user else None,
                cadet_regimental_number=cadet.enrollment_number if cadet else None,
                cadet_rank=cadet.rank if cadet else "CDT",
                college_name=college.name if college else None,
                mode=_enum_val(s.mode, "quick_practice"),
                title=s.title,
                status=_enum_val(s.status, "in_progress"),
                total_score=s.total_score,
                total_correct=s.total_correct or 0,
                total_wrong=s.total_wrong or 0,
                total_unanswered=s.total_unanswered or 0,
                accuracy_percentage=s.accuracy_percentage,
                duration_seconds=s.duration_seconds or 0,
                time_spent_seconds=s.time_spent_seconds or 0,
                start_time=s.start_time,
                created_at=s.created_at,
            )
        )
    return res, total


def get_cadet_test_sessions(db: Session, cadet_id: int) -> List[CadetSessionAdminOut]:
    """Retrieve all mock test sessions taken by a specific cadet."""
    c = db.query(Cadet).filter(Cadet.id == cadet_id).first()
    if not c:
        return []
    items, _ = admin_list_sessions(db, user_id=c.user_id, limit=100)
    return items


def get_cadet_analytics_by_cadet_id(db: Session, cadet_id: int) -> dict:
    """Retrieve full performance diagnostics and radar profile for a specific cadet."""
    c = db.query(Cadet).filter(Cadet.id == cadet_id).first()
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cadet not found")
    data = get_cadet_analytics(db, user_id=c.user_id)
    college = db.query(College).filter(College.id == c.college_id).first() if c.college_id else None
    data["cadet"] = {
        "id": c.id,
        "full_name": c.full_name,
        "enrollment_number": c.enrollment_number,
        "rank": c.rank or "CDT",
        "wing": _enum_val(c.wing, "SD"),
        "college_name": college.name if college else "Battalion Affiliated",
    }
    return data


def get_officer_exam_overview(db: Session) -> dict:
    """Return summary statistics and comprehensive analytics of cadet exam outcomes for Officers and Administrators."""
    total_sessions = db.query(NCCTestSession).count()
    completed = db.query(NCCTestSession).filter(NCCTestSession.status == NCCTestStatusEnum.completed).all()
    completed_count = len(completed)
    avg_score = round(sum((s.total_score or 0.0) for s in completed) / completed_count, 1) if completed_count > 0 else 0.0
    avg_accuracy = round(sum((s.accuracy_percentage or 0.0) for s in completed) / completed_count, 1) if completed_count > 0 else 0.0

    distinction_count = sum(1 for s in completed if (s.accuracy_percentage or 0.0) >= 75.0)
    pass_count = sum(1 for s in completed if 50.0 <= (s.accuracy_percentage or 0.0) < 75.0)
    fail_count = sum(1 for s in completed if (s.accuracy_percentage or 0.0) < 50.0)
    pass_rate_pct = round((distinction_count + pass_count) / completed_count * 100.0, 1) if completed_count > 0 else 0.0

    # Mode breakdown
    mode_counts = {}
    for s in completed:
        m_val = _enum_val(s.mode, "quick_practice")
        if m_val not in mode_counts:
            mode_counts[m_val] = {"count": 0, "scores": [], "accuracies": []}
        mode_counts[m_val]["count"] += 1
        if s.total_score is not None:
            mode_counts[m_val]["scores"].append(s.total_score)
        if s.accuracy_percentage is not None:
            mode_counts[m_val]["accuracies"].append(s.accuracy_percentage)

    mode_breakdown = [
        {
            "mode": m,
            "count": d["count"],
            "avg_score": round(sum(d["scores"]) / len(d["scores"]), 1) if d["scores"] else 0.0,
            "avg_accuracy": round(sum(d["accuracies"]) / len(d["accuracies"]), 1) if d["accuracies"] else 0.0,
        }
        for m, d in mode_counts.items()
    ]

    # Topic performance across all students
    topics = db.query(NCCQuestionTopic).all()
    topic_name_map = {t.code: t.name for t in topics}

    topic_stats_query = (
        db.query(
            NCCQuestion.topic_code,
            func.count(NCCTestAnswer.id).label("attempts"),
            func.sum(case((NCCTestAnswer.is_correct == True, 1), else_=0)).label("correct"),
        )
        .join(NCCTestAnswer, NCCTestAnswer.question_id == NCCQuestion.id)
        .join(NCCTestSession, NCCTestSession.id == NCCTestAnswer.session_id)
        .filter(NCCTestSession.status == NCCTestStatusEnum.completed)
        .group_by(NCCQuestion.topic_code)
        .all()
    )

    topic_analytics = []
    for t_code, attempts, correct in topic_stats_query:
        corr_val = int(correct or 0)
        att_val = int(attempts or 0)
        acc = round(corr_val / att_val * 100.0, 1) if att_val > 0 else 0.0
        status_val = "strong" if acc >= 75.0 else ("moderate" if acc >= 50.0 else "weak")
        topic_analytics.append({
            "topic_code": t_code,
            "topic_name": topic_name_map.get(t_code, t_code.replace("_", " ").title()),
            "total_attempts": att_val,
            "total_correct": corr_val,
            "accuracy_percentage": acc,
            "status": status_val,
        })
    topic_analytics.sort(key=lambda x: x["accuracy_percentage"], reverse=True)

    # Cadet rankings
    cadet_rankings_query = (
        db.query(
            Cadet.id.label("cadet_id"),
            Cadet.full_name,
            Cadet.enrollment_number,
            Cadet.rank,
            College.name.label("college_name"),
            func.count(NCCTestSession.id).label("exams_taken"),
            func.avg(NCCTestSession.total_score).label("avg_score"),
            func.avg(NCCTestSession.accuracy_percentage).label("avg_accuracy"),
            func.max(NCCTestSession.total_score).label("max_score"),
            func.max(NCCTestSession.created_at).label("last_exam_date"),
            func.sum(case((NCCTestSession.accuracy_percentage >= 50.0, 1), else_=0)).label("passed_count"),
        )
        .join(User, Cadet.user_id == User.id)
        .join(NCCTestSession, NCCTestSession.user_id == User.id)
        .outerjoin(College, Cadet.college_id == College.id)
        .filter(NCCTestSession.status == NCCTestStatusEnum.completed)
        .group_by(Cadet.id, Cadet.full_name, Cadet.enrollment_number, Cadet.rank, College.name)
        .order_by(func.avg(NCCTestSession.accuracy_percentage).desc())
        .all()
    )

    cadet_rankings = []
    for c in cadet_rankings_query:
        exams = int(c.exams_taken or 0)
        passed = int(c.passed_count or 0)
        cadet_rankings.append({
            "cadet_id": c.cadet_id,
            "full_name": c.full_name,
            "enrollment_number": c.enrollment_number,
            "rank": c.rank or "CDT",
            "college_name": c.college_name or "Battalion Affiliated",
            "exams_taken": exams,
            "avg_score": round(float(c.avg_score or 0.0), 1),
            "avg_accuracy": round(float(c.avg_accuracy or 0.0), 1),
            "max_score": round(float(c.max_score or 0.0), 1),
            "pass_rate": round(passed / exams * 100.0, 1) if exams > 0 else 0.0,
            "last_exam_date": c.last_exam_date.isoformat() if hasattr(c.last_exam_date, "isoformat") else str(c.last_exam_date or ""),
        })

    recent_sessions, _ = admin_list_sessions(db, limit=50)

    return {
        "total_sessions": total_sessions,
        "completed_count": completed_count,
        "average_score": avg_score,
        "average_accuracy": avg_accuracy,
        "pass_rate_percentage": pass_rate_pct,
        "distinction_count": distinction_count,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "mode_breakdown": mode_breakdown,
        "topic_analytics": topic_analytics,
        "cadet_rankings": cadet_rankings,
        "recent_sessions": recent_sessions,
    }



def admin_delete_session(db: Session, session_id: int) -> bool:
    session = db.query(NCCTestSession).filter(NCCTestSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test session not found")
    db.delete(session)
    db.commit()
    return True

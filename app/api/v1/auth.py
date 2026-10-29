import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import SupabaseToken, Token, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def verify_supabase_token(access_token: str) -> dict:
    """
    Verifies a Supabase access token via two complementary methods:
    1. Local JWT decode using SUPABASE_JWT_SECRET (fast, zero latency)
    2. Supabase Auth API verification via GET {SUPABASE_URL}/auth/v1/user (resilient fallback)
    """
    # Method 1: Local JWT secret decode
    if settings.supabase_jwt_secret:
        try:
            claims = jwt.decode(
                access_token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return claims
        except Exception as exc:
            print(f"[Supabase Auth] Local JWT secret decode note: {exc}. Trying Supabase Auth API...")

    # Method 2: Supabase Auth REST verification
    if settings.supabase_url:
        try:
            url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "apikey": settings.supabase_anon_key or settings.supabase_service_role_key or "",
            }
            with httpx.Client(timeout=8.0) as client:
                res = client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "role": "authenticated",
                        "email": data.get("email"),
                        "sub": data.get("id"),
                        "user_metadata": data.get("user_metadata", {}),
                    }
                else:
                    print(f"[Supabase Auth] Auth endpoint returned {res.status_code}: {res.text[:120]}")
        except Exception as exc:
            print(f"[Supabase Auth] Auth API request error: {exc}")

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or unverified Supabase authentication session")


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        token = auth_service.login(db, form_data.username, form_data.password)
        return Token(access_token=token)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication server error: {str(e)}"
        )


@router.post("/supabase", response_model=Token)
def login_with_supabase(payload: SupabaseToken, db: Session = Depends(get_db)):
    claims = verify_supabase_token(payload.access_token)
    token = auth_service.login_with_supabase(db, claims)
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cadet_id = None
    mentor_id = None
    full_name = None
    wing = None
    rank = None
    college_name = None
    battalion_name = None

    if current_user.role.value == "cadet" and current_user.cadet_profile:
        cadet = current_user.cadet_profile
        cadet_id = cadet.id
        full_name = cadet.full_name
        wing = cadet.wing.value if hasattr(cadet.wing, "value") else str(cadet.wing)
        rank = cadet.rank
        if cadet.college:
            college_name = cadet.college.name
            if cadet.college.battalion:
                battalion_name = cadet.college.battalion.name
    elif current_user.role.value == "mentor" and current_user.mentor_profile:
        mentor = current_user.mentor_profile
        mentor_id = mentor.id
        full_name = mentor.enrollment_number
        if mentor.college:
            college_name = mentor.college.name
        if mentor.battalion:
            battalion_name = mentor.battalion.name

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        cadet_id=cadet_id,
        mentor_id=mentor_id,
        full_name=full_name,
        wing=wing,
        rank=rank,
        college_name=college_name,
        battalion_name=battalion_name,
    )

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.security import hash_password, verify_password, create_access_token
from app.config import get_settings
from app.utils.responses import success

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])
settings = get_settings()


@router.post("/signup", response_model=schemas.APIResponse[schemas.TokenResponse], status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_ALREADY_REGISTERED", "message": "An account with this email already exists."},
        )

    user = models.User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return success(
        schemas.TokenResponse(
            access_token=token,
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=schemas.UserResponse.model_validate(user),
        )
    )


@router.post("/login", response_model=schemas.APIResponse[schemas.TokenResponse])
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password."},
    )

    if not user or not verify_password(payload.password, user.hashed_password):
        raise invalid_credentials

    token = create_access_token(subject=user.id)
    return success(
        schemas.TokenResponse(
            access_token=token,
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=schemas.UserResponse.model_validate(user),
        )
    )


@router.get("/me", response_model=schemas.APIResponse[schemas.UserResponse])
def get_me(current_user: models.User = Depends(get_current_user)):
    return success(schemas.UserResponse.model_validate(current_user))

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import string
import secrets
from google.oauth2 import id_token
from google.auth.transport import requests

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


@router.post("/google", response_model=schemas.APIResponse[schemas.TokenResponse])
def google_login(payload: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail={"code": "INTERNAL_ERROR", "message": "Google Client ID not configured on server."})

    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(payload.credential, requests.Request(), settings.GOOGLE_CLIENT_ID)
        email = idinfo.get("email")
        name = idinfo.get("name", "Google User")
        
        if not email:
            raise ValueError("No email in token")
            
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid Google token."},
        )

    # Check if user exists
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Create user with a random unguessable password since they use Google Auth
        alphabet = string.ascii_letters + string.digits + string.punctuation
        random_password = ''.join(secrets.choice(alphabet) for _ in range(32))
        
        user = models.User(
            email=email,
            hashed_password=hash_password(random_password),
            full_name=name,
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


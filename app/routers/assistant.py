from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.services.assistant_engine import handle_chat_message
from app.utils.responses import success

router = APIRouter(prefix="/api/v1/assistant", tags=["Assistant"])


@router.post("/chat", response_model=schemas.APIResponse[schemas.ChatResponse])
def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = handle_chat_message(db, payload.message)
    return success(schemas.ChatResponse(**result))


@router.get("/products", response_model=schemas.APIResponse[list[schemas.ProductResponse]])
def get_products(
    category: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Product)
    if category:
        query = query.filter(models.Product.category == category)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (models.Product.name.ilike(search_pattern)) | (models.Product.description.ilike(search_pattern))
        )
    products = query.all()
    return success([schemas.ProductResponse.model_validate(p) for p in products])


from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pathlib import Path
import yaml

from database.database import get_db
from database.models import User
from utils.auth import (
    authenticate_user, 
    create_access_token, 
    get_current_active_user
)

# Load config from the correct path
config_path = Path(__file__).parents[2] / "config.yaml"
with open(config_path, "r") as file:
    config = yaml.safe_load(file)

ACCESS_TOKEN_EXPIRE_MINUTES = config["auth"]["token_expiry_minutes"]

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    role: str
    full_name: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "doctor"

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
            "user_id": user.id
        },
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name
    }

@router.get("/me", response_model=dict)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

@router.post("/verify-token")
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """Verify that a token is valid."""
    return {
        "valid": True,
        "user_id": current_user.id,
        "role": current_user.role,
        "username": current_user.username,
        "full_name": current_user.full_name
    }

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import yaml

from database.database import get_db
from database.models import User

# Load config from the correct path
config_path = Path(__file__).parent.parent.parent / "config.yaml"
with open(config_path, "r") as file:
    config = yaml.safe_load(file)

# Get settings from config
SECRET_KEY = config["app"]["secret_key"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = config["auth"]["token_expiry_minutes"]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate a user by username and password."""
    user = db.query(User).filter(User.username == username).first()
    
    # If we're in debug mode and have a user
    if config["app"]["debug"] and user:
        # Check test users first
        for test_user in config["test_users"]:
            if (test_user["username"] == username and 
                test_user["password"] == password):
                # Update password hash
                user.hashed_password = get_password_hash(password)
                db.commit()
                return user
    
    # Regular password check
    if user and verify_password(password, user.hashed_password):
        return user
    
    # Debug mode: create test user if needed
    if config["app"]["debug"] and not user:
        for test_user in config["test_users"]:
            if (test_user["username"] == username and 
                test_user["password"] == password):
                new_user = User(
                    username=username,
                    email=test_user["email"],
                    hashed_password=get_password_hash(password),
                    full_name=test_user.get("full_name", f"Dr. {username.title()}"),
                    role=test_user["role"],
                    is_active=True
                )
                db.add(new_user)
                try:
                    db.commit()
                    db.refresh(new_user)
                    return new_user
                except Exception:
                    db.rollback()
    
    return None

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Get the current user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Error: {str(e)}")
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def check_admin_role(current_user: User = Depends(get_current_active_user)):
    """Check if the current user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def check_doctor_role(current_user: User = Depends(get_current_active_user)):
    """Check if the current user has doctor role."""
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

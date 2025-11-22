from datetime import timedelta
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.schemas import schemas
from app.core import security
from app.database import get_db
from app.repositories import user_repository
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register_user(self, user_data: schemas.UserCreate) -> schemas.User:
        try:
            user_data.username = user_data.username.strip()
            
            if user_repository.get_user_by_username(self.db, user_data.username):
                raise ValueError("Username already taken")
            
            if not security.validate_password_complexity(user_data.password):
                raise ValueError('Password must contain uppercase, lowercase and numbers')
            
            db_user = user_repository.create_user(self.db, user_data)

            return db_user
        except (ValueError, ConnectionError) as e:
            raise e
        except Exception as e:
            
            raise Exception("Registration service unavailable - please try again later")
    
    def login_user(self, username: str, password: str) -> schemas.Token:
        try:
            user = user_repository.get_user_by_username(self.db, username)

            if not user or not security.verify_password(password, user.hashed_password):
                raise ValueError("Incorrect credentials")

            access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)

            access_token = security.create_access_token(
                data={"sub": str(user.id)},
                expires_delta=access_token_expires
            )

            return schemas.Token(access_token=access_token, token_type="bearer")

        except ValueError as e:
            print("Error:", e)
            raise e
        except Exception as e:
            print("Error:", e)
            raise

def get_auth_service(db: Session = Depends(get_db)):
    return AuthService(db)
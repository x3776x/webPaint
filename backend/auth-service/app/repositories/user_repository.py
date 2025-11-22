from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
from app.core.security import get_password_hash
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError

def get_user_by_username(db: Session, username: str):
    """Find a user by their username"""
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_id(db: Session, user_id: int):
    """Find a user by their ID."""
    try:
        return db.query(models.User).filter(models.User.id == user_id).first()
    except OperationalError as e:
        raise ConnectionError("Database connection error - please try again later")
    except Exception as e:
        raise e

def create_user(db: Session, user: schemas.UserCreate):
    try:
        new_user = models.User(
            hashed_password=get_password_hash(user.password),
            username=user.username,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except OperationalError as e:
        db.rollback()
        raise ConnectionError("Database connection error - please try again later")
    except SQLAlchemyError as e:
        db.rollback()
        raise Exception("Database error - please try again later")
    except Exception as e:
        db.rollback()
        raise e
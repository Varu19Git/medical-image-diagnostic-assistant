import os
import yaml
import argparse
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import text # Import text
from passlib.context import CryptContext
import sys
import json # Add json import
from datetime import datetime # Add datetime import

# Ensure the correct module path is added for resolving imports
# This adds the project root (medical-ai-diagnostics) to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.database.database import Base, engine, SessionLocal
from backend.database.models import User, Image, Diagnosis, Report

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    """Generate a hash from password"""
    return pwd_context.hash(password)

def init_db():
    """Initialize the database, creating tables and default users."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")
    
    # Load config - use absolute path from project root
    config_path = Path(__file__).parents[2] / "config.yaml"
    try:
        with open(config_path, "r") as file:
            config = yaml.safe_load(file)
            print(f"Loaded config from {config_path}")
    except Exception as e:
        print(f"Error loading config from {config_path}: {e}")
        return
    
    # Create test users if they don't exist
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0 and "test_users" in config:
            print("Creating test users...")
            for user_config in config["test_users"]:
                print(f"Processing user {user_config['username']}")
                # Create user with default full_name if not provided
                hashed_password = get_password_hash(user_config["password"])
                full_name = user_config.get("full_name", f"Dr. {user_config['username'].title()}")
                db_user = User(
                    username=user_config["username"],
                    email=user_config["email"],
                    hashed_password=hashed_password,
                    full_name=full_name,
                    role=user_config["role"],
                    is_active=True
                )
                
                db.add(db_user)
                print(f"Created user: {user_config['username']} with role {user_config['role']}")
            
            db.commit()
            print("Test users created successfully!")
        else:
            print(f"Found {user_count} existing users, skipping test user creation.")
    except Exception as e:
        db.rollback()
        print(f"Error creating test users: {str(e)}")
        raise
    finally:
        db.close()

def create_admin_user(username, email, password, full_name=None):
    """Create an admin user manually."""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"User {username} already exists.")
            return
        
        # Create admin user
        hashed_password = get_password_hash(password)
        db_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name or username,
            role="admin"
        )
        
        db.add(db_user)
        db.commit()
        print(f"Admin user {username} created successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {str(e)}")
    finally:
        db.close()

def add_mock_data():
    """Add mock data for predictions, images, and reports."""
    db = SessionLocal()
    try:
        # Add mock images first, as diagnoses and reports depend on them
        mock_images = [
            {
                "id": 1, 
                "filename": "mock_image_1.jpg", 
                "original_filename": "mock_image_1.jpg",
                "file_path": "uploads/mock_image_1.jpg", 
                "file_size": 1024, # Example size
                "mime_type": "image/jpeg", # Example mime type
                "image_type": "X-ray"
            },
            {
                "id": 2, 
                "filename": "mock_image_2.jpg", 
                "original_filename": "mock_image_2.jpg",
                "file_path": "uploads/mock_image_2.jpg", 
                "file_size": 2048, # Example size
                "mime_type": "image/jpeg", # Example mime type
                "image_type": "CT Scan"
            },
        ]
        for image_data in mock_images:
            # Check if image already exists
            existing_image = db.query(Image).filter(Image.id == image_data["id"]).first()
            if not existing_image:
                db.execute(
                    text("""
                    INSERT INTO images (id, filename, original_filename, file_path, file_size, mime_type, image_type, uploaded_at)
                    VALUES (:id, :filename, :original_filename, :file_path, :file_size, :mime_type, :image_type, :uploaded_at)
                    """),
                    {**image_data, "uploaded_at": datetime.utcnow()}
                )
            else:
                print(f"Image with id {image_data['id']} already exists, skipping.")

        # Add mock diagnoses (formerly predictions)
        mock_diagnoses = [
            {
                "id": 1, 
                "user_id": 1, 
                "image_id": 1, 
                "prediction_data": {"result": "Positive", "details": "Indication of pneumonia"},
                "confidence_score": 0.95, 
                "status": "completed"
            },
            {
                "id": 2, 
                "user_id": 2, 
                "image_id": 2, 
                "prediction_data": {"result": "Negative", "details": "No abnormalities detected"},
                "confidence_score": 0.89, 
                "status": "pending"
            },
        ]
        for diagnosis_data in mock_diagnoses:
            # Check if diagnosis already exists
            existing_diagnosis = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_data["id"]).first()
            if not existing_diagnosis:
                db.execute(
                    text("""
                    INSERT INTO diagnoses (id, user_id, image_id, prediction_data, confidence_score, status, created_at, updated_at)
                    VALUES (:id, :user_id, :image_id, :prediction_data, :confidence_score, :status, :created_at, :updated_at)
                    """),
                    {**diagnosis_data, "prediction_data": json.dumps(diagnosis_data["prediction_data"]), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
                )
            else:
                print(f"Diagnosis with id {diagnosis_data['id']} already exists, skipping.")

        # Add mock reports
        mock_reports = [
            {
                "id": 1, 
                "diagnosis_id": 1, 
                "report_path": "outputs/reports/mock_report_1.pdf", 
                "report_type": "pdf"
            },
            {
                "id": 2, 
                "diagnosis_id": 2, 
                "report_path": "outputs/reports/mock_report_2.txt", 
                "report_type": "txt"
            },
        ]
        for report_data in mock_reports:
            # Check if report already exists
            existing_report = db.query(Report).filter(Report.id == report_data["id"]).first()
            if not existing_report:
                db.execute(
                    text("""
                    INSERT INTO reports (id, diagnosis_id, report_path, report_type, generated_at)
                    VALUES (:id, :diagnosis_id, :report_path, :report_type, :generated_at)
                    """),
                    {**report_data, "generated_at": datetime.utcnow()}
                )
            else:
                print(f"Report with id {report_data['id']} already exists, skipping.")

        db.commit()
        print("Mock data added successfully (or skipped if already present)!")
    except Exception as e:
        db.rollback()
        print(f"Error adding mock data: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize the database")
    parser.add_argument("--create-admin", action="store_true", help="Create an admin user")
    parser.add_argument("--username", help="Admin username")
    parser.add_argument("--email", help="Admin email")
    parser.add_argument("--password", help="Admin password")
    parser.add_argument("--full-name", help="Admin full name")
    parser.add_argument("--add-mock-data", action="store_true", help="Add mock data for testing")

    args = parser.parse_args()

    # Initialize database
    init_db()

    # Create admin user if requested
    if args.create_admin:
        if not all([args.username, args.email, args.password]):
            print("Error: To create an admin user, you must provide username, email, and password.")
        else:
            create_admin_user(args.username, args.email, args.password, args.full_name)

    # Add mock data if requested
    if args.add_mock_data:
        add_mock_data()

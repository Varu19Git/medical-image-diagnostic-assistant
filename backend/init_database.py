#!/usr/bin/env python3
"""
Database initialization script for Medical AI Diagnostics.
This script initializes the database and creates test users from config.yaml.
"""
import os
import sys
from pathlib import Path
import argparse

# Add the current directory to the path so we can import the database modules
sys.path.append(str(Path(__file__).parent))

from database.database import Base, engine, SessionLocal
from database.init_db import init_db
from database.models import Image, Diagnosis, Report

def add_mock_data():
    """Add mock data for predictions, images, and reports."""
    db = SessionLocal()
    try:
        # Add mock images
        mock_image = Image(
            filename="mock_image.jpg",
            original_filename="mock_image.jpg",
            file_path="uploads/mock_image.jpg",
            file_size=1024,
            mime_type="image/jpeg",
            image_type="X-ray",
            width=224,
            height=224
        )
        db.add(mock_image)
        db.commit()
        db.refresh(mock_image)

        # Add mock predictions
        mock_prediction = Diagnosis(
            image_id=mock_image.id,
            user_id=1,  # Assuming user with ID 1 exists
            prediction_data={"Pneumonia": 0.8, "Normal": 0.2},
            confidence_score=0.8,
            status="completed"
        )
        db.add(mock_prediction)
        db.commit()

        # Add mock reports
        mock_report = Report(
            diagnosis_id=mock_prediction.id,
            report_path="docs/reports/mock_report.pdf",
            report_type="pdf"
        )
        db.add(mock_report)
        db.commit()

        print("Mock data added successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error adding mock data: {str(e)}")
    finally:
        db.close()

def main():
    """Initialize the database and create test users."""
    print("Initializing database...")
    
    # Create tables
    Base.metadata.drop_all(bind=engine)  # Drop all tables first to ensure clean state
    Base.metadata.create_all(bind=engine)
    
    # Initialize with test users from config.yaml
    init_db()
    
    print("Database initialization complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize the database")
    parser.add_argument("--create-admin", action="store_true", help="Create an admin user")
    parser.add_argument("--add-mock-data", action="store_true", help="Add mock data")
    parser.add_argument("--username", help="Admin username")
    parser.add_argument("--email", help="Admin email")
    parser.add_argument("--password", help="Admin password")
    parser.add_argument("--full-name", help="Admin full name")

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

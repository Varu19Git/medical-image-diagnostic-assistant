from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


class UserRole(enum.Enum):
    doctor = "doctor"
    reviewer = "reviewer" 
    admin = "admin"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), nullable=False, default="doctor")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    diagnoses = relationship("Diagnosis", back_populates="user")
    feedback = relationship("Feedback", back_populates="user")


class Image(Base):
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False, unique=True)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String(100), nullable=False)
    image_type = Column(String(50))  # X-ray, CT, MRI, etc.
    width = Column(Integer)
    height = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    diagnoses = relationship("Diagnosis", back_populates="image")


class Diagnosis(Base):
    __tablename__ = "diagnoses"
    
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prediction_data = Column(JSON)  # Store prediction results as JSON
    confidence_score = Column(Float)
    status = Column(String(20), default="pending")  # pending, completed, reviewed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    image = relationship("Image", back_populates="diagnoses")
    user = relationship("User", back_populates="diagnoses")
    feedback = relationship("Feedback", back_populates="diagnosis")
    heatmaps = relationship("Heatmap", back_populates="diagnosis")
    report = relationship("Report", back_populates="diagnosis")


class Heatmap(Base):
    __tablename__ = "heatmaps"
    
    id = Column(Integer, primary_key=True, index=True)
    diagnosis_id = Column(Integer, ForeignKey("diagnoses.id"), nullable=False)
    file_path = Column(String(255), nullable=False)
    method = Column(String(50), nullable=False)  # grad-cam, shap, etc.
    label = Column(String(100), nullable=False)  # What class this heatmap explains
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    diagnosis = relationship("Diagnosis", back_populates="heatmaps")


class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    diagnosis_id = Column(Integer, ForeignKey("diagnoses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feedback_text = Column(Text)
    override_diagnosis = Column(Text)
    rating = Column(Integer)  # 1-5 rating of AI accuracy
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    diagnosis = relationship("Diagnosis", back_populates="feedback")
    user = relationship("User", back_populates="feedback")


class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    diagnosis_id = Column(Integer, ForeignKey("diagnoses.id"), nullable=False)
    report_path = Column(String(255), nullable=False)
    report_type = Column(String(10), nullable=False)  # pdf, txt
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    diagnosis = relationship("Diagnosis", back_populates="report")

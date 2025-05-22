import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
import yaml
from datetime import datetime

from database.database import get_db
from database.models import Diagnosis, Report, User, Image, Feedback
from utils.auth import get_current_active_user, check_doctor_role
from utils.report_generator import generate_pdf_report, generate_txt_report

# Load configuration
def load_config():
    with open("../config.yaml", "r") as file:
        return yaml.safe_load(file)

config = load_config()
REPORTS_DIR = config["storage"]["reports_dir"]

# Ensure reports directory exists
os.makedirs(REPORTS_DIR, exist_ok=True)

router = APIRouter()

class ReportRequest(BaseModel):
    diagnosis_id: int
    report_type: str = "pdf"  # pdf or txt
    include_heatmaps: bool = True
    additional_notes: str = None

class ReportResponse(BaseModel):
    id: int
    diagnosis_id: int
    report_path: str
    report_type: str
    generated_at: datetime
    
    class Config:
        from_attributes = True

def background_generate_report(
    diagnosis_id: int,
    report_type: str,
    include_heatmaps: bool,
    additional_notes: str,
    db: Session
):
    """Background task to generate a report."""
    # Get diagnosis data
    diagnosis = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id).first()
    if not diagnosis:
        return
    
    # Get image data
    image = db.query(Image).filter(Image.id == diagnosis.image_id).first()
    if not image:
        return
    
    # Get feedback if any
    feedback = db.query(Feedback).filter(Feedback.diagnosis_id == diagnosis.id).first()
    
    # Generate report filename
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    report_filename = f"report_{diagnosis_id}_{timestamp}.{report_type}"
    report_path = os.path.join(REPORTS_DIR, report_filename)
    
    # Generate report based on type
    if report_type == "pdf":
        generate_pdf_report(
            diagnosis=diagnosis,
            image=image,
            feedback=feedback,
            output_path=report_path,
            include_heatmaps=include_heatmaps,
            additional_notes=additional_notes
        )
    else:  # txt
        generate_txt_report(
            diagnosis=diagnosis,
            image=image,
            feedback=feedback,
            output_path=report_path,
            include_heatmaps=False,  # Can't include images in text
            additional_notes=additional_notes
        )
    
    # Save to database
    db_report = Report(
        diagnosis_id=diagnosis.id,
        report_path=report_path,
        report_type=report_type
    )
    
    db.add(db_report)
    db.commit()

@router.post("/", response_model=dict)
async def create_report(
    report_request: ReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_doctor_role)
):
    """Create a new report for a diagnosis."""
    # Validate diagnosis
    diagnosis = db.query(Diagnosis).filter(Diagnosis.id == report_request.diagnosis_id).first()
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    
    # Check if report type is valid
    if report_request.report_type not in ["pdf", "txt"]:
        raise HTTPException(status_code=400, detail="Invalid report type. Must be 'pdf' or 'txt'")
    
    # Start background task to generate report
    background_tasks.add_task(
        background_generate_report,
        diagnosis.id,
        report_request.report_type,
        report_request.include_heatmaps,
        report_request.additional_notes,
        db
    )
    
    return {
        "message": "Report generation started",
        "diagnosis_id": diagnosis.id,
        "report_type": report_request.report_type
    }

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a report by ID."""
    db_report = db.query(Report).filter(Report.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return db_report

@router.get("/by-diagnosis/{diagnosis_id}", response_model=List[ReportResponse])
async def get_reports_by_diagnosis(
    diagnosis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all reports for a diagnosis."""
    reports = db.query(Report).filter(Report.diagnosis_id == diagnosis_id).all()
    return reports

@router.get("/", response_model=List[ReportResponse])
async def list_reports(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all reports."""
    reports = db.query(Report).offset(skip).limit(limit).all()
    return reports

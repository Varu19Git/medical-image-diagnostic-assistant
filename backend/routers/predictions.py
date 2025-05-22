import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import yaml
import json

from database.database import get_db
from database.models import Image, Diagnosis, Heatmap, User
from utils.auth import get_current_active_user, check_doctor_role
from models.model_interface import predict_image, load_model
from xai.grad_cam import generate_gradcam

# Load configuration
def load_config():
    with open("../config.yaml", "r") as file:
        return yaml.safe_load(file)

config = load_config()
OUTPUTS_DIR = config["storage"]["outputs_dir"]

# Ensure outputs directory exists
os.makedirs(OUTPUTS_DIR, exist_ok=True)

router = APIRouter()

class PredictionRequest(BaseModel):
    image_id: int
    model_name: str = "chest-xray"  # Default model

    model_config = ConfigDict(protected_namespaces=())

class HeatmapResponse(BaseModel):
    id: int
    diagnosis_id: int
    file_path: str
    method: str
    label: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class PredictionResponse(BaseModel):
    id: int
    image_id: int
    model_name: str
    user_id: int
    predictions: Dict[str, float]
    confidence_score: float
    status: str
    created_at: datetime
    heatmap_paths: Dict[str, str] = {}

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class PredictionDetailResponse(PredictionResponse):
    """Detailed response including heatmap information."""
    heatmaps: List[HeatmapResponse] = [] # Forward reference for HeatmapResponse

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

def background_generate_heatmaps(diagnosis_id: int, image_path: str, predictions: Dict[str, float], db: Session):
    """Background task to generate heatmaps for all predictions."""
    # Load model
    model = load_model(config["models"][0]["path"])
    
    for label, confidence in predictions.items():
        if confidence > config["models"][0]["conf_threshold"]:
            try:
                # Generate heatmap
                heatmap_filename = f"heatmap_{diagnosis_id}_{label.lower().replace(' ', '_')}.png"
                heatmap_path = os.path.join(OUTPUTS_DIR, heatmap_filename)
                
                # Generate Grad-CAM heatmap
                generate_gradcam(model, image_path, label, heatmap_path)
                
                # Save to database
                db_heatmap = Heatmap(
                    diagnosis_id=diagnosis_id,
                    file_path=heatmap_path,
                    method="grad-cam",
                    label=label
                )
                
                db.add(db_heatmap)
                db.commit()
            except Exception as e:
                print(f"Error generating heatmap for {label}: {str(e)}")

@router.post("/", response_model=PredictionResponse)
async def create_prediction(
    prediction_request: PredictionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_doctor_role)
):
    """Create a new prediction for an image."""
    # Get the image
    db_image = db.query(Image).filter(Image.id == prediction_request.image_id).first()
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Get the model configuration
    model_config = None
    for model in config["models"]:
        if model["name"] == prediction_request.model_name:
            model_config = model
            break
    
    if model_config is None:
        raise HTTPException(status_code=404, detail=f"Model {prediction_request.model_name} not found")
    
    # Make prediction
    try:
        predictions, confidence = predict_image(db_image.file_path, model_config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
    
    # Save to database
    db_diagnosis = Diagnosis(
        image_id=db_image.id,
        user_id=current_user.id,
        prediction_data=predictions,
        confidence_score=confidence,
        status="completed"
    )
    
    db.add(db_diagnosis)
    db.commit()
    db.refresh(db_diagnosis)
    
    # Generate heatmaps in the background
    background_tasks.add_task(
        background_generate_heatmaps,
        db_diagnosis.id,
        db_image.file_path,
        predictions,
        db
    )
    
    return db_diagnosis

@router.get("/{diagnosis_id}", response_model=PredictionDetailResponse)
async def get_prediction(
    diagnosis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a prediction by ID."""
    db_diagnosis = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id).first()
    if db_diagnosis is None:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    
    # Get associated heatmaps
    heatmaps = db.query(Heatmap).filter(Heatmap.diagnosis_id == diagnosis_id).all()
    heatmap_paths = {heatmap.label: heatmap.file_path for heatmap in heatmaps}
    
    # Combine diagnosis with heatmap paths
    result = db_diagnosis.__dict__.copy()
    result["heatmap_paths"] = heatmap_paths
    
    return result

@router.get("/", response_model=List[PredictionResponse])
async def list_predictions(
    skip: int = 0,
    limit: int = 100,
    image_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all predictions, optionally filtered by image ID."""
    query = db.query(Diagnosis)
    
    if image_id:
        query = query.filter(Diagnosis.image_id == image_id)
    
    diagnoses = query.offset(skip).limit(limit).all()
    
    # For each diagnosis, get associated heatmaps
    result = []
    for diagnosis in diagnoses:
        heatmaps = db.query(Heatmap).filter(Heatmap.diagnosis_id == diagnosis.id).all()
        heatmap_paths = {heatmap.label: heatmap.file_path for heatmap in heatmaps}
        
        diagnosis_dict = diagnosis.__dict__.copy()
        diagnosis_dict["heatmap_paths"] = heatmap_paths
        result.append(diagnosis_dict)
    
    return result

@router.get("/{diagnosis_id}/heatmaps", response_model=List[HeatmapResponse])
async def get_heatmaps(
    diagnosis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all heatmaps for a diagnosis."""
    db_diagnosis = db.query(Diagnosis).filter(Diagnosis.id == diagnosis_id).first()
    if db_diagnosis is None:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    
    heatmaps = db.query(Heatmap).filter(Heatmap.diagnosis_id == diagnosis_id).all()
    return heatmaps

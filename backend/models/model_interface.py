import os
import torch
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
from typing import Dict, Tuple, List, Any, Optional

# Default model paths (for development/testing)
DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pt")

# Global model cache
_model_cache = {}

def load_model(model_path: Optional[str] = None) -> torch.nn.Module:
    """Load the PyTorch model for inference.
    
    Args:
        model_path: Path to the model weights file. If None, uses default.
        
    Returns:
        The loaded PyTorch model.
    """
    if model_path is None:
        model_path = DEFAULT_MODEL_PATH
    
    # Check if model is already loaded in cache
    if model_path in _model_cache:
        return _model_cache[model_path]
    
    # For development, create a dummy model if real model doesn't exist
    if not os.path.exists(model_path):
        print(f"Warning: Model file {model_path} not found. Using dummy model.")
        # Create a dummy ResNet model
        model = torch.hub.load('pytorch/vision:v0.10.0', 'resnet18', pretrained=True)
        # Modify final layer for medical classification
        num_classes = 4  # Example: Normal, Pneumonia, Tuberculosis, COVID-19
        model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
        model.eval()
    else:
        # Load actual model
        model = torch.load(model_path, map_location=torch.device('cpu'))
        model.eval()
    
    # Store in cache
    _model_cache[model_path] = model
    
    return model

def preprocess_image(image_path: str, input_size: Tuple[int, int] = (224, 224)) -> torch.Tensor:
    """Preprocess an image for model inference.
    
    Args:
        image_path: Path to the image file.
        input_size: Model input dimensions (height, width).
        
    Returns:
        Preprocessed image tensor.
    """
    # Open image and convert to RGB
    image = Image.open(image_path).convert('RGB')
    
    # Define preprocessing
    preprocess = transforms.Compose([
        transforms.Resize(input_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    # Preprocess image
    input_tensor = preprocess(image)
    input_batch = input_tensor.unsqueeze(0)  # Add batch dimension
    
    return input_batch

def predict_image(image_path: str, model_config: Dict[str, Any]) -> Tuple[Dict[str, float], float]:
    """Run inference on an image using the specified model.
    
    Args:
        image_path: Path to the image file.
        model_config: Configuration for the model.
        
    Returns:
        Tuple of (predictions dict, overall confidence score)
    """
    # Get model path and input size from config
    model_path = model_config.get("path", None)
    input_size = tuple(model_config.get("input_size", (224, 224)))
    labels = model_config.get("labels", ["Normal", "Abnormal"])
    
    # Load model
    model = load_model(model_path)
    
    # Preprocess image
    input_batch = preprocess_image(image_path, input_size)
    
    # Run inference
    with torch.no_grad():
        output = model(input_batch)
        
    # Apply softmax to get probabilities
    probabilities = torch.nn.functional.softmax(output[0], dim=0)
    
    # Get predictions
    predictions = {}
    for i, label in enumerate(labels):
        predictions[label] = probabilities[i].item()
    
    # Overall confidence score (highest probability)
    confidence_score = max(predictions.values())
    
    return predictions, confidence_score

def get_top_predictions(predictions: Dict[str, float], threshold: float = 0.5) -> Dict[str, float]:
    """Filter predictions to only include those above the threshold.
    
    Args:
        predictions: Dictionary of label->confidence.
        threshold: Confidence threshold.
        
    Returns:
        Filtered dictionary of predictions above threshold.
    """
    return {k: v for k, v in predictions.items() if v >= threshold}

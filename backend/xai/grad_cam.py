import torch
import torch.nn.functional as F
import numpy as np
import cv2
from PIL import Image
import torchvision.transforms as transforms
from typing import Optional, Union, List

class GradCAM:
    """
    Implements Grad-CAM for CNN visualization.
    Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization
    https://arxiv.org/abs/1610.02391
    """

    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks
        target_layer.register_forward_hook(self._forward_hook)
        target_layer.register_backward_hook(self._backward_hook)
    
    def _forward_hook(self, module, input, output):
        self.activations = output
    
    def _backward_hook(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
    
    def generate(self, input_image, class_idx=None):
        """
        Generate a Grad-CAM heatmap for the specified class.
        
        Args:
            input_image: Input tensor [1, C, H, W]
            class_idx: Index of the class to generate CAM for, 
                       or None for the maximum scoring class
        
        Returns:
            Grad-CAM heatmap as numpy array
        """
        # Forward pass
        output = self.model(input_image)
        
        # If class_idx is None, use the class with highest score
        if class_idx is None:
            class_idx = torch.argmax(output)
        
        # Zero gradients
        self.model.zero_grad()
        
        # Target for backprop
        one_hot = torch.zeros_like(output)
        one_hot[0][class_idx] = 1
        
        # Backward pass
        output.backward(gradient=one_hot, retain_graph=True)
        
        # Global average pooling of gradients
        weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)
        
        # Weighted combination of activation maps
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)
        
        # ReLU to only keep positive influences
        cam = F.relu(cam)
        
        # Normalize
        cam = F.interpolate(cam, size=input_image.shape[2:], mode='bilinear', align_corners=False)
        cam = cam[0, 0].detach().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        
        return cam

def preprocess_image(image_path, input_size=(224, 224)):
    """Preprocess an image for Grad-CAM."""
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
    
    return input_batch, image

def generate_gradcam(model, image_path, target_class, output_path, layer_name=None):
    """
    Generate a Grad-CAM heatmap and save it as an overlay on the original image.
    
    Args:
        model: PyTorch model
        image_path: Path to input image
        target_class: Target class name or index
        output_path: Path to save output visualization
        layer_name: Name of the layer to use for Grad-CAM (if None, use last conv layer)
    """
    # Determine the target layer (default: last convolutional layer)
    if layer_name is None:
        # For ResNet, use the last residual block
        if hasattr(model, 'layer4'):
            target_layer = model.layer4[-1].conv2
        else:
            # Find last convolutional layer
            last_conv = None
            for module in model.modules():
                if isinstance(module, torch.nn.Conv2d):
                    last_conv = module
            target_layer = last_conv
    else:
        # Get the specified layer
        raise NotImplementedError("Layer name lookup not implemented yet")
    
    # Preprocess image
    input_tensor, original_image = preprocess_image(image_path)
    
    # Create Grad-CAM object
    grad_cam = GradCAM(model, target_layer)
    
    # If target_class is a string, convert to class index based on model
    if isinstance(target_class, str):
        # For development, just use a random index
        # In a real implementation, this would map class names to indices
        class_idx = 0  # Default to first class
        if hasattr(model, 'classes') and target_class in model.classes:
            class_idx = model.classes.index(target_class)
    else:
        class_idx = target_class
    
    # Generate heatmap
    cam = grad_cam.generate(input_tensor, class_idx)
    
    # Convert original image to numpy array
    img = np.array(original_image)
    
    # Resize heatmap to original image size
    heatmap = cv2.resize(cam, (img.shape[1], img.shape[0]))
    
    # Convert heatmap to RGB
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    
    # Superimpose heatmap on original image
    superimposed = cv2.addWeighted(img, 0.6, heatmap, 0.4, 0)
    
    # Save the result
    cv2.imwrite(output_path, superimposed[:, :, ::-1])  # Convert RGB to BGR for cv2
    
    return output_path

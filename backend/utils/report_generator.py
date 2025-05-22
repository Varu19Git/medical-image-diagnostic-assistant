import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_pdf_report(
    diagnosis: Any,
    image: Any,
    feedback: Optional[Any] = None,
    output_path: str = None,
    include_heatmaps: bool = True,
    additional_notes: Optional[str] = None
):
    """
    Generate a PDF report for a medical image diagnosis.
    
    Args:
        diagnosis: The diagnosis database object
        image: The image database object
        feedback: Optional feedback database object
        output_path: Path to save the PDF report
        include_heatmaps: Whether to include heatmap visualizations
        additional_notes: Additional notes to include in the report
    """
    # Create document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='Heading1',
        fontName='Helvetica-Bold',
        fontSize=16,
        spaceAfter=12
    ))
    styles.add(ParagraphStyle(
        name='Heading2',
        fontName='Helvetica-Bold',
        fontSize=14,
        spaceAfter=8
    ))
    
    # Build content
    content = []
    
    # Title
    title = Paragraph("Medical Image Diagnosis Report", styles['Heading1'])
    content.append(title)
    content.append(Spacer(1, 0.2 * inch))
    
    # Date and time
    date_string = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    date_paragraph = Paragraph(f"Generated on: {date_string}", styles['Normal'])
    content.append(date_paragraph)
    content.append(Spacer(1, 0.2 * inch))
    
    # Image information
    content.append(Paragraph("Image Information", styles['Heading2']))
    image_data = [
        ["Original Filename", image.original_filename],
        ["Image Type", image.image_type],
        ["Dimensions", f"{image.width} x {image.height}"],
        ["Uploaded", image.uploaded_at.strftime("%Y-%m-%d %H:%M:%S UTC")]
    ]
    image_table = Table(image_data, colWidths=[2*inch, 3*inch])
    image_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('PADDING', (0, 0), (-1, -1), 6)
    ]))
    content.append(image_table)
    content.append(Spacer(1, 0.2 * inch))
    
    # Original image
    try:
        if os.path.exists(image.file_path):
            content.append(Paragraph("Original Image:", styles['Normal']))
            img = RLImage(image.file_path, width=4*inch, height=3*inch)
            content.append(img)
            content.append(Spacer(1, 0.2 * inch))
    except Exception as e:
        content.append(Paragraph(f"Error loading image: {str(e)}", styles['Normal']))
    
    # Diagnosis results
    content.append(Paragraph("Diagnosis Results", styles['Heading2']))
    
    # Extract predictions from diagnosis
    predictions = diagnosis.prediction_data
    if predictions:
        # Sort predictions by confidence score
        sorted_predictions = sorted(predictions.items(), key=lambda x: x[1], reverse=True)
        
        pred_data = [["Condition", "Confidence"]]
        for label, score in sorted_predictions:
            pred_data.append([label, f"{score:.2%}"])
        
        pred_table = Table(pred_data, colWidths=[3*inch, 2*inch])
        pred_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('PADDING', (0, 0), (-1, -1), 6)
        ]))
        content.append(pred_table)
        content.append(Spacer(1, 0.2 * inch))
    else:
        content.append(Paragraph("No prediction data available", styles['Normal']))
        content.append(Spacer(1, 0.2 * inch))
    
    # Include heatmaps if available
    if include_heatmaps:
        content.append(Paragraph("Visualization (Grad-CAM)", styles['Heading2']))
        
        # In a real implementation, we would query for heatmaps related to this diagnosis
        # For now, we'll add a placeholder message
        content.append(Paragraph("Heatmap visualizations highlight regions of interest that influenced the AI prediction.", styles['Normal']))
        content.append(Spacer(1, 0.1 * inch))
        
        # We would loop through available heatmaps here
        # This would typically involve looking at diagnosis.heatmaps relationship
        
    # Include feedback if available
    if feedback:
        content.append(Paragraph("Doctor's Feedback", styles['Heading2']))
        feedback_data = [
            ["Feedback Date", feedback.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")],
            ["Rating", f"{feedback.rating}/5"],
            ["Override Diagnosis", feedback.override_diagnosis or "None"]
        ]
        feedback_table = Table(feedback_data, colWidths=[2*inch, 3*inch])
        feedback_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('PADDING', (0, 0), (-1, -1), 6)
        ]))
        content.append(feedback_table)
        content.append(Spacer(1, 0.2 * inch))
        
        if feedback.feedback_text:
            content.append(Paragraph("Additional Comments:", styles['Normal']))
            content.append(Paragraph(feedback.feedback_text, styles['Normal']))
            content.append(Spacer(1, 0.2 * inch))
    
    # Additional notes
    if additional_notes:
        content.append(Paragraph("Additional Notes", styles['Heading2']))
        content.append(Paragraph(additional_notes, styles['Normal']))
        content.append(Spacer(1, 0.2 * inch))
    
    # Disclaimer
    content.append(Paragraph("Disclaimer", styles['Heading2']))
    disclaimer_text = (
        "This report was generated using an AI-assisted diagnostic system. "
        "The results should be interpreted by a qualified healthcare professional. "
        "This tool is designed to assist, not replace, clinical judgment."
    )
    content.append(Paragraph(disclaimer_text, styles['Normal']))
    
    # Build the PDF document
    doc.build(content)
    
    return output_path

def generate_txt_report(
    diagnosis: Any,
    image: Any,
    feedback: Optional[Any] = None,
    output_path: str = None,
    include_heatmaps: bool = False,  # Ignored for text reports
    additional_notes: Optional[str] = None
):
    """
    Generate a text report for a medical image diagnosis.
    
    Args:
        diagnosis: The diagnosis database object
        image: The image database object
        feedback: Optional feedback database object
        output_path: Path to save the text report
        include_heatmaps: Ignored for text reports
        additional_notes: Additional notes to include in the report
    """
    with open(output_path, 'w') as f:
        # Title
        f.write("MEDICAL IMAGE DIAGNOSIS REPORT\n")
        f.write("=" * 40 + "\n\n")
        
        # Date and time
        date_string = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        f.write(f"Generated on: {date_string}\n\n")
        
        # Image information
        f.write("IMAGE INFORMATION\n")
        f.write("-" * 40 + "\n")
        f.write(f"Original Filename: {image.original_filename}\n")
        f.write(f"Image Type: {image.image_type}\n")
        f.write(f"Dimensions: {image.width} x {image.height}\n")
        f.write(f"Uploaded: {image.uploaded_at.strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n")
        
        # Diagnosis results
        f.write("DIAGNOSIS RESULTS\n")
        f.write("-" * 40 + "\n")
        
        # Extract predictions from diagnosis
        predictions = diagnosis.prediction_data
        if predictions:
            # Sort predictions by confidence score
            sorted_predictions = sorted(predictions.items(), key=lambda x: x[1], reverse=True)
            
            for label, score in sorted_predictions:
                f.write(f"{label}: {score:.2%}\n")
            f.write("\n")
        else:
            f.write("No prediction data available\n\n")
        
        # Include feedback if available
        if feedback:
            f.write("DOCTOR'S FEEDBACK\n")
            f.write("-" * 40 + "\n")
            f.write(f"Feedback Date: {feedback.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
            f.write(f"Rating: {feedback.rating}/5\n")
            f.write(f"Override Diagnosis: {feedback.override_diagnosis or 'None'}\n\n")
            
            if feedback.feedback_text:
                f.write("Additional Comments:\n")
                f.write(f"{feedback.feedback_text}\n\n")
        
        # Additional notes
        if additional_notes:
            f.write("ADDITIONAL NOTES\n")
            f.write("-" * 40 + "\n")
            f.write(f"{additional_notes}\n\n")
        
        # Disclaimer
        f.write("DISCLAIMER\n")
        f.write("-" * 40 + "\n")
        f.write(
            "This report was generated using an AI-assisted diagnostic system. "
            "The results should be interpreted by a qualified healthcare professional. "
            "This tool is designed to assist, not replace, clinical judgment.\n"
        )
    
    return output_path

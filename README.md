# Medical AI Diagnostics System

A full-stack, production-ready medical image diagnostic system powered by AI. This application enables healthcare professionals to upload medical images (X-ray, CT, MRI), get AI-powered diagnoses with confidence scores, view explanations through heatmaps, and generate detailed reports.

## Features

- **Medical Image Analysis**: Upload and analyze X-ray, CT, or MRI images
- **AI-Powered Diagnostics**: Get predictions with confidence scores for multiple potential conditions
- **Explainable AI**: View Grad-CAM or SHAP heatmaps to understand what parts of the image influence predictions
- **Role-Based Access**: Separate interfaces for doctors, reviewers, and administrators
- **Feedback System**: Allow doctors to override AI diagnoses and provide feedback
- **Report Generation**: Create and download PDF/TXT reports with notes and findings
- **History & Storage**: Access past diagnoses and maintain patient records
- **Secure Authentication**: Login system with role-based permissions

## Tech Stack

- **Frontend**: React with Tailwind CSS
- **Backend**: FastAPI (Python)
- **AI**: PyTorch models served via FastAPI
- **XAI**: Grad-CAM for visualization, SHAP support planned
- **Authentication**: JWT-based auth with role support
- **Database**: SQLite for development, with migration paths to PostgreSQL
- **Deployment**: Docker support for easy deployment to various platforms

## Project Structure

```
/medical-ai-diagnostics
  /frontend           # React frontend application
  /backend            # FastAPI backend server
    /models           # AI model definitions and weights
    /xai              # Explainable AI implementations (Grad-CAM, SHAP)
    /database         # Database models and migrations
    /routers          # API route definitions
    /utils            # Utility functions
  /uploads            # Temporary storage for uploaded images
  /outputs            # Generated outputs (heatmaps, etc.)
  /docs               # Documentation and report templates
  .env                # Environment variables (not committed)
  config.yaml         # Application configuration
  requirements.txt    # Python dependencies
  docker-compose.yml  # Docker configuration
```

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/medical-ai-diagnostics.git
   cd medical-ai-diagnostics
   ```

2. Set up Python environment
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up React frontend
   ```
   cd frontend
   npm install
   ```

4. Create your environment file
   ```
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Start the backend server
   ```
   cd backend
   uvicorn main:app --reload
   ```

6. Start the frontend development server
   ```
   cd frontend
   npm start
   ```

## Deployment

The application can be deployed using Docker:

```
docker-compose up -d
```

## License

[MIT License](LICENSE)

## Acknowledgments

- PyTorch for AI model support
- FastAPI for the backend framework
- React for the frontend framework

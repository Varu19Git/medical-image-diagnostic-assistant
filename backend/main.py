import os
import yaml
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import routers
from routers import auth, images, predictions, reports, users

# Load environment variables
load_dotenv()

# Load configuration
def load_config():
    with open("../config.yaml", "r") as file:
        return yaml.safe_load(file)

config = load_config()

# Initialize FastAPI app
app = FastAPI(
    title=config["app"]["name"],
    description=config["app"]["description"],
    version=config["app"]["version"],
)

# Configure CORS
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Medical AI Diagnostics API",
        "version": config["app"]["version"],
        "docs_url": "/docs",
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    uvicorn.run("main:app", host=host, port=port, reload=debug)

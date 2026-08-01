"""
Vercel Serverless entry point for CareerPath FastAPI backend.
Mangum wraps the ASGI FastAPI app so Vercel can invoke it as a Lambda function.
"""
import sys
import os
from pathlib import Path

# Make sure the project root is on sys.path so 'app' can be imported
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Import the FastAPI app from the project root
from app import app  # noqa: E402

# Mangum bridges ASGI (FastAPI) <-> AWS Lambda / Vercel Functions
from mangum import Mangum  # noqa: E402

# lifespan="off" prevents startup/shutdown events from crashing the lambda
handler = Mangum(app, lifespan="off")

"""
Vercel Serverless entry point for CareerPath FastAPI backend.
Vercel Python runtime detects the exported `app` object and runs FastAPI natively.
"""
import sys
from pathlib import Path

# Add project root directory to sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Import the FastAPI app from app.py
from app import app  # noqa: E402, F401

"""
Vercel WSGI / Serverless Entrypoint for SmartAttend Flask Backend.
Exports the 'app' instance for Vercel's Python runtime.
"""
import os
from app import create_app

# Default to production configuration in Vercel environment
app = create_app(os.getenv("FLASK_ENV", "production"))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

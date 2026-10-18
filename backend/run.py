"""SmartAttend Backend Application Runner."""
import sys
import os
from app import create_app
from app.extensions import db

app = create_app()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == "seed":
            from seed import seed_data
            seed_data()
            sys.exit(0)
        elif command == "init-db":
            with app.app_context():
                db.create_all()
                print("Database tables created successfully.")
            sys.exit(0)

    with app.app_context():
        try:
            db.create_all()
            print("[SmartAttend] PostgreSQL tables verified/created successfully.")
        except Exception as e:
            print(f"[SmartAttend Database Notice] PostgreSQL connection test: {e}")
            print("[SmartAttend Database Notice] Ensure your Supabase connection string is set in DATABASE_URL in .env")

    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    print(f"Starting SmartAttend Backend on http://127.0.0.1:{port} (Debug: {debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)

# app.py
from flask import Flask
from routes.main_routes import main_bp
from routes.api_routes import api_bp

app = Flask(__name__)

# Register Blueprints (groups of routes)
app.register_blueprint(main_bp)
app.register_blueprint(api_bp, url_prefix='/api') # Prefix all API routes with /api

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

# routes/main_routes.py
from flask import Blueprint, render_template

# Create a Blueprint for main routes
main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    # This will look for a file in the 'templates' folder named 'index.html'
    return render_template('index.html')
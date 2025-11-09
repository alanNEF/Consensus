#!/bin/bash
# Setup script for Python virtual environment

set -e

echo "Setting up Python virtual environment..."

# Navigate to python directory
cd "$(dirname "$0")"

# Check if venv already exists
if [ -d "venv" ]; then
    echo "Virtual environment already exists. Removing old one..."
    rm -rf venv
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing requirements from requirements.txt..."
pip install -r requirements.txt

# Verify installation
echo ""
echo "Verifying installation..."
python3 -c "import dotenv; print('✓ dotenv installed')"
python3 -c "import numpy; print('✓ numpy installed')"
python3 -c "import supabase; print('✓ supabase installed')"
python3 -c "import pymilvus; print('✓ pymilvus installed')"
python3 -c "import sentence_transformers; print('✓ sentence-transformers installed')"

echo ""
echo "✓ Virtual environment setup complete!"
echo ""
echo "To activate the virtual environment manually, run:"
echo "  source venv/bin/activate"
echo ""
echo "To test the search API script, run:"
echo "  python src/search_api.py 'climate change'"


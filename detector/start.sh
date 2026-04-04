#!/bin/bash
echo "Checking footage..."
python check_footage.py

echo ""
echo "Starting NETRA detector on port 8000..."
python -m detector.main

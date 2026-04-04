@echo off
echo Setting up HRMS Backend Environment...

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
) else (
    echo Virtual environment already exists.
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Setup Complete!
echo To run the server, use functionality: python app.py
echo.
pause

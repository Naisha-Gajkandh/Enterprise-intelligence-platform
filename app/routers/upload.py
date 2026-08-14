from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
import pandas as pd
import io
from app import models, schemas
from app.dependencies import get_current_user
from app.services.ollama_engine import analyze_data_summary
from app.utils.responses import success
import logging

router = APIRouter(prefix="/api/v1/upload", tags=["Upload & Analysis"])
logger = logging.getLogger("app.upload")

@router.post("/analyze", response_model=schemas.APIResponse[dict])
async def analyze_file(
    file: UploadFile = File(...),
    # Uncomment to require auth: current_user: models.User = Depends(get_current_user)
):
    """
    Upload a CSV or XLSX file, parse it with Pandas, extract basic stats,
    and generate an analysis using the local Ollama instance.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Check file extension
    file_ext = file.filename.split(".")[-1].lower()
    if file_ext not in ["csv", "xlsx"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Please upload a .csv or .xlsx file."
        )

    try:
        content = await file.read()
        
        # Parse the file into a Pandas DataFrame
        if file_ext == "csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
        
        if df.empty:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")
            
        # Create a basic summary
        summary_lines = []
        summary_lines.append(f"Columns: {', '.join(df.columns.tolist())}")
        summary_lines.append(f"Number of rows: {len(df)}")
        summary_lines.append("\nSummary Statistics:")
        summary_lines.append(df.describe(include='all').to_string())
        
        summary_text = "\n".join(summary_lines)
        
        # Call Ollama
        analysis = analyze_data_summary(summary_text)
        
        return success({
            "filename": file.filename,
            "rows_processed": len(df),
            "columns": df.columns.tolist(),
            "analysis": analysis
        })
        
    except Exception as e:
        logger.exception("Failed to process file")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

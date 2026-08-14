"""
Upload & Analysis Router
-------------------------
1. User uploads CSV/XLSX
2. Python ML preprocessing runs FIRST (R², feature importance, correlations)
3. Parsed data is ingested into PostgreSQL (Products + Transactions)
4. ML metrics are passed to Ollama for an executive summary
5. Full structured response returned to frontend
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
import io
import logging
from datetime import date

from app import models, schemas
from app.database import get_db
from app.services.ml_preprocessing import analyze_dataset, format_ml_summary_for_llm
from app.services.ollama_engine import analyze_data_summary
from app.utils.responses import success

router = APIRouter(prefix="/api/v1/upload", tags=["Upload & Analysis"])
logger = logging.getLogger("app.upload")


def _ingest_into_database(df: pd.DataFrame, db: Session) -> dict:
    """
    Parse the uploaded DataFrame and insert rows into the Products
    and Transactions tables so the dashboard KPIs, charts, and
    assistant all reflect the uploaded data.
    
    Supports two CSV schemas:
      A) Columns like PRODUCTCODE, PRODUCTLINE, SALES, ORDERDATE, QUANTITYORDERED
      B) Columns like product_id, category, revenue, order_date, quantity
    """
    col_map = {c.upper().replace(" ", "_"): c for c in df.columns}
    cols_upper = set(col_map.keys())

    ingested = {"products": 0, "transactions": 0}

    try:
        # ── Detect schema type ──────────────────────────────────────
        # Schema A: typical sales dataset (PRODUCTCODE, PRODUCTLINE, etc.)
        if "PRODUCTCODE" in cols_upper or "PRODUCTLINE" in cols_upper:
            return _ingest_sales_schema(df, col_map, db)
        # Schema B: our native format (category + revenue/sales/price)
        elif "CATEGORY" in cols_upper and any(k in cols_upper for k in ["REVENUE", "SALES", "PRICE", "TOTAL", "AMOUNT"]):
            return _ingest_native_schema(df, col_map, db)
        else:
            # Generic: just create transactions from numeric + date columns
            return _ingest_generic(df, db)
    except Exception as e:
        logger.exception("Database ingestion failed")
        return {"products": 0, "transactions": 0, "error": str(e)}


def _ingest_sales_schema(df: pd.DataFrame, col_map: dict, db: Session) -> dict:
    """Handle CSV with PRODUCTCODE, PRODUCTLINE, SALES, PRICEEACH, etc."""
    # Clear existing data
    db.query(models.Transaction).delete()
    db.query(models.Product).delete()
    db.commit()

    # Get original column names
    def orig(key):
        return col_map.get(key)

    # Extract unique products
    prod_code_col = orig("PRODUCTCODE")
    prod_line_col = orig("PRODUCTLINE") or orig("CATEGORY")
    price_col = orig("PRICEEACH") or orig("PRICE") or orig("MSRP")
    desc_col = orig("PRODUCTDESCRIPTION") or orig("DESCRIPTION")

    product_map = {}  # productcode -> product_id
    if prod_code_col:
        unique_products = df.drop_duplicates(subset=[prod_code_col])
        for _, row in unique_products.iterrows():
            code = str(row.get(prod_code_col, "Unknown"))
            category = str(row.get(prod_line_col, "Other")) if prod_line_col else "Other"
            price = float(row[price_col]) if price_col and pd.notna(row.get(price_col)) else 0.0
            description = str(row.get(desc_col, f"Product {code}")) if desc_col else f"Product {code}"

            product = models.Product(
                name=code,
                category=category,
                price=price,
                description=description,
            )
            db.add(product)
            db.flush()
            product_map[code] = product.id

    # Insert transactions
    sales_col = orig("SALES") or orig("REVENUE") or orig("TOTAL")
    qty_col = orig("QUANTITYORDERED") or orig("QUANTITY") or orig("QTY")
    date_col = orig("ORDERDATE") or orig("ORDER_DATE") or orig("DATE")

    count = 0
    for _, row in df.iterrows():
        try:
            # Parse date
            order_date = None
            if date_col and pd.notna(row.get(date_col)):
                try:
                    order_date = pd.to_datetime(row[date_col]).date()
                except Exception:
                    order_date = date.today()
            else:
                order_date = date.today()

            # Get product reference
            prod_code = str(row.get(prod_code_col, "Unknown")) if prod_code_col else "Unknown"
            product_id = product_map.get(prod_code)

            # If product doesn't exist, create one on the fly
            if not product_id:
                category = str(row.get(prod_line_col, "Other")) if prod_line_col else "Other"
                product = models.Product(name=prod_code, category=category, price=0, description=f"Product {prod_code}")
                db.add(product)
                db.flush()
                product_id = product.id
                product_map[prod_code] = product_id

            category = str(row.get(prod_line_col, "Other")) if prod_line_col else "Other"
            revenue = float(row[sales_col]) if sales_col and pd.notna(row.get(sales_col)) else 0.0
            quantity = int(row[qty_col]) if qty_col and pd.notna(row.get(qty_col)) else 1

            db.add(models.Transaction(
                order_date=order_date,
                product_id=product_id,
                category=category,
                quantity=quantity,
                revenue=revenue,
            ))
            count += 1
        except Exception as e:
            logger.warning(f"Skipping row: {e}")
            continue

    db.commit()
    return {"products": len(product_map), "transactions": count}


def _ingest_native_schema(df: pd.DataFrame, col_map: dict, db: Session) -> dict:
    """Handle CSV with category, revenue, order_date columns."""
    db.query(models.Transaction).delete()
    db.query(models.Product).delete()
    db.commit()

    def orig(key):
        return col_map.get(key)

    cat_col = orig("CATEGORY")
    rev_col = orig("REVENUE") or orig("SALES") or orig("PRICE") or orig("TOTAL") or orig("AMOUNT")
    qty_col = orig("QUANTITY")
    date_col = orig("ORDER_DATE") or orig("DATE") or orig("ORDERDATE")
    prod_col = orig("PRODUCT") or orig("PRODUCT_ID") or orig("PRODUCT_NAME") or orig("NAME") or orig("DISH_NAME") or orig("RESTAURANT_NAME")

    # Create products from unique categories or product names
    product_map = {}
    if prod_col:
        for name in df[prod_col].dropna().unique():
            cat = df[df[prod_col] == name][cat_col].iloc[0] if cat_col else "Other"
            p = models.Product(name=str(name), category=str(cat), price=0, description=str(name))
            db.add(p)
            db.flush()
            product_map[str(name)] = p.id
    elif cat_col:
        for cat in df[cat_col].dropna().unique():
            p = models.Product(name=str(cat), category=str(cat), price=0, description=f"Category: {cat}")
            db.add(p)
            db.flush()
            product_map[str(cat)] = p.id

    count = 0
    transaction_dicts = []
    for _, row in df.iterrows():
        try:
            order_date = date.today()
            if date_col and pd.notna(row.get(date_col)):
                try:
                    order_date = pd.to_datetime(row[date_col]).date()
                except Exception:
                    pass

            cat = str(row.get(cat_col, "Other")) if cat_col else "Other"
            prod_key = str(row.get(prod_col, cat)) if prod_col else cat
            product_id = product_map.get(prod_key)
            if not product_id:
                p = models.Product(name=prod_key, category=cat, price=0, description=prod_key)
                db.add(p)
                db.flush()
                product_id = p.id
                product_map[prod_key] = product_id

            revenue = float(row[rev_col]) if rev_col and pd.notna(row.get(rev_col)) else 0.0
            quantity = int(row[qty_col]) if qty_col and pd.notna(row.get(qty_col)) else 1

            transaction_dicts.append({
                "order_date": order_date,
                "product_id": product_id,
                "category": cat,
                "quantity": quantity,
                "revenue": revenue,
            })
            count += 1
            
            if len(transaction_dicts) >= 2000:
                db.bulk_insert_mappings(models.Transaction, transaction_dicts)
                transaction_dicts = []

        except Exception as e:
            logger.warning(f"Skipping row: {e}")
            continue

    if transaction_dicts:
        db.bulk_insert_mappings(models.Transaction, transaction_dicts)

    db.commit()
    return {"products": len(product_map), "transactions": count}


def _ingest_generic(df: pd.DataFrame, db: Session) -> dict:
    """Fallback: try to ingest any CSV by guessing columns."""
    from app.services.ml_preprocessing import _detect_target_column, _detect_date_column

    db.query(models.Transaction).delete()
    db.query(models.Product).delete()
    db.commit()

    target = _detect_target_column(df)
    date_col = _detect_date_column(df)

    if not target:
        return {"products": 0, "transactions": 0, "error": "Could not detect a revenue/sales column."}

    # Find a categorical column for product grouping
    cat_cols = df.select_dtypes(include=["object"]).columns.tolist()
    cat_col = cat_cols[0] if cat_cols else None

    product_map = {}
    if cat_col:
        for cat in df[cat_col].dropna().unique()[:100]:
            p = models.Product(name=str(cat), category=str(cat), price=0, description=str(cat))
            db.add(p)
            db.flush()
            product_map[str(cat)] = p.id

    count = 0
    transaction_dicts = []
    for _, row in df.iterrows():
        try:
            order_date = date.today()
            if date_col and pd.notna(row.get(date_col)):
                try:
                    order_date = pd.to_datetime(row[date_col]).date()
                except Exception:
                    pass

            cat = str(row.get(cat_col, "General")) if cat_col else "General"
            product_id = product_map.get(cat)
            if not product_id:
                p = models.Product(name=cat, category=cat, price=0, description=cat)
                db.add(p)
                db.flush()
                product_id = p.id
                product_map[cat] = product_id

            revenue = float(row[target]) if pd.notna(row.get(target)) else 0.0
            qty_col = None
            for c in df.columns:
                if "quant" in c.lower() or "qty" in c.lower():
                    qty_col = c
                    break
            quantity = int(row[qty_col]) if qty_col and pd.notna(row.get(qty_col)) else 1

            transaction_dicts.append({
                "order_date": order_date,
                "product_id": product_id,
                "category": cat,
                "quantity": quantity,
                "revenue": revenue,
            })
            count += 1
            
            if len(transaction_dicts) >= 2000:
                db.bulk_insert_mappings(models.Transaction, transaction_dicts)
                transaction_dicts = []

        except Exception as e:
            logger.warning(f"Skipping row: {e}")
            continue

    if transaction_dicts:
        db.bulk_insert_mappings(models.Transaction, transaction_dicts)

    db.commit()
    return {"products": len(product_map), "transactions": count}


@router.post("/analyze", response_model=schemas.APIResponse[dict])
def analyze_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a CSV or XLSX file. Pipeline:
      1. Parse with Pandas
      2. ML preprocessing (R², feature importance, correlations) — pure Python
      3. Ingest into PostgreSQL so dashboard updates
      4. Pass ML metrics to Ollama for executive summary only
      5. Return everything
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    file_ext = file.filename.split(".")[-1].lower()
    if file_ext not in ["csv", "xlsx"]:
        raise HTTPException(status_code=400, detail="Invalid file format. Upload a .csv or .xlsx file.")

    try:
        content = file.file.read()

        logger.info("Step 1: Parsing file")
        # ── Step 1: Parse ───────────────────────────────────────────
        if file_ext == "csv":
            try:
                df = pd.read_csv(io.BytesIO(content))
            except UnicodeDecodeError:
                # Fallback for Excel-exported CSVs (often cp1252 or latin-1)
                df = pd.read_csv(io.BytesIO(content), encoding="latin-1")
        else:
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")

        if df.empty:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        logger.info("Step 2: ML Preprocessing")
        # ── Step 2: ML Preprocessing (no AI) ────────────────────────
        ml_results = analyze_dataset(df)

        logger.info("Step 3: Ingesting into PostgreSQL")
        # ── Step 3: Ingest into PostgreSQL ──────────────────────────
        ingestion = _ingest_into_database(df, db)
        ml_results["ingestion"] = ingestion

        logger.info("Step 4: Ollama summary")
        # ── Step 4: Pass hard metrics to Ollama for summary ─────────
        # Fast socket probe: check if Ollama port is open before calling it
        ml_summary_text = format_ml_summary_for_llm(ml_results)
        ollama_available = False
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)  # 500ms — instant on localhost
            result = sock.connect_ex(("127.0.0.1", 11434))
            sock.close()
            ollama_available = (result == 0)
        except Exception:
            ollama_available = False

        if ollama_available:
            try:
                logger.info("Calling Ollama...")
                ollama_prompt = (
                    "You are a senior business analyst. Based on the following "
                    "machine learning analysis results, write a concise executive "
                    "summary (3-4 sentences) highlighting the key business insights. "
                    "Focus on actionable takeaways.\n\n"
                    f"{ml_summary_text}"
                )
                ai_summary = analyze_data_summary(ollama_prompt)
                logger.info("Ollama responded.")
            except Exception as e:
                logger.error(f"Ollama failed: {e}")
                ollama_available = False

        if not ollama_available:
            # Generate a programmatic summary from hard ML metrics
            ml = ml_results.get("ml_model", {})
            if ml.get("status") == "success":
                top_features = ", ".join(
                    f"{f['feature']} ({f['importance_pct']:.1f}%)"
                    for f in ml.get("feature_importance", [])[:3]
                )
                r2 = ml.get("r2_score", 0)
                r2_text = "strong" if r2 > 0.7 else "moderate" if r2 > 0.3 else "weak"
                ai_summary = (
                    f"ML Analysis Complete: The model shows a {r2_text} predictive relationship "
                    f"(R2={r2:.4f}) for '{ml.get('target_column')}'. "
                    f"Top driving features are: {top_features}. "
                    f"Dataset contains {ml_results['profiling']['rows']} rows with "
                    f"{ml_results['profiling']['missing_values_total']} missing values."
                )
            else:
                ai_summary = (
                    f"Dataset profiled: {ml_results['profiling']['rows']} rows, "
                    f"{ml_results['profiling']['columns']} columns, "
                    f"{ml_results['profiling']['missing_values_total']} missing values. "
                    f"ML model training was skipped: {ml.get('reason', 'unknown')}."
                )

        # ── Step 5: Build response ──────────────────────────────────
        return success({
            "filename": file.filename,
            "rows_processed": len(df),
            "columns": df.columns.tolist(),
            # Profiling
            "profiling": ml_results["profiling"],
            # ML Model results
            "ml_model": ml_results["ml_model"],
            # Top correlations
            "top_correlations": ml_results["top_correlations"],
            # Category breakdowns
            "category_breakdowns": ml_results["category_breakdowns"],
            # Numeric stats
            "numeric_summary": ml_results["numeric_summary"],
            # Data preview
            "preview": ml_results["preview"],
            # Database ingestion report
            "ingestion": ingestion,
            # AI executive summary (from hard metrics, not raw data)
            "ai_summary": ai_summary,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to process file")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

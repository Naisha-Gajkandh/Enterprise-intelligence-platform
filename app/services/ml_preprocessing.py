"""
ML Preprocessing Service
-------------------------
Performs programmatic data analysis using scikit-learn and pandas —
no AI involved. Computes:
  - Descriptive statistics (missing values, duplicates, dtypes)
  - Correlation matrix for numeric columns
  - R² score via RandomForestRegressor on auto-detected target
  - Feature importance ranking
  - Top category/segment breakdowns

The AI (Ollama) is only called AFTER this module returns hard numbers,
so it writes a summary from facts rather than guessing from raw data.
"""

import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger("app.ml_preprocessing")

# Common names for revenue / sales target columns (case-insensitive)
TARGET_HINTS = ["sales", "revenue", "total", "amount", "price", "profit"]
DATE_HINTS = ["date", "orderdate", "order_date", "timestamp", "created"]


def _detect_target_column(df: pd.DataFrame) -> str | None:
    """Auto-detect the most likely numeric target column."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for hint in TARGET_HINTS:
        for col in numeric_cols:
            if hint in col.lower():
                return col
    # Fallback: pick the numeric column with the highest variance
    if numeric_cols:
        return df[numeric_cols].var().idxmax()
    return None


def _detect_date_column(df: pd.DataFrame) -> str | None:
    """Auto-detect a date column."""
    for col in df.columns:
        if any(hint in col.lower().replace("_", "") for hint in DATE_HINTS):
            return col
    # Try parsing each object column as date
    for col in df.select_dtypes(include=["object"]).columns:
        try:
            pd.to_datetime(df[col].head(20), infer_datetime_format=True)
            return col
        except Exception:
            continue
    return None


def _safe_json(val):
    """Convert numpy types to Python natives for JSON serialization."""
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return round(float(val), 4)
    if isinstance(val, np.ndarray):
        return [_safe_json(v) for v in val]
    if pd.isna(val):
        return None
    return val


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    Run the full ML preprocessing pipeline on a DataFrame.
    Returns a dict with all computed metrics — no AI calls.
    """
    results = {}

    # ── 1. Basic profiling ──────────────────────────────────────────
    total_rows = len(df)
    total_cols = len(df.columns)
    missing_per_col = df.isnull().sum().to_dict()
    total_missing = int(df.isnull().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    schema = []
    for col in df.columns:
        schema.append({
            "column": col,
            "dtype": str(df[col].dtype),
            "missing": int(missing_per_col.get(col, 0)),
            "unique": int(df[col].nunique()),
        })

    results["profiling"] = {
        "rows": total_rows,
        "columns": total_cols,
        "missing_values_total": total_missing,
        "duplicate_rows": duplicate_rows,
        "schema": schema,
    }

    # ── 2. Descriptive statistics for numeric columns ───────────────
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_summary = []
    for col in numeric_cols:
        s = df[col].dropna()
        numeric_summary.append({
            "column": col,
            "mean": _safe_json(s.mean()),
            "std": _safe_json(s.std()),
            "min": _safe_json(s.min()),
            "max": _safe_json(s.max()),
            "median": _safe_json(s.median()),
        })
    results["numeric_summary"] = numeric_summary

    # ── 3. Correlation matrix (top correlations) ────────────────────
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols].corr()
        # Extract top 10 absolute correlations (excluding self-correlation)
        pairs = []
        for i, c1 in enumerate(numeric_cols):
            for c2 in numeric_cols[i + 1:]:
                pairs.append({
                    "feature_1": c1,
                    "feature_2": c2,
                    "correlation": _safe_json(corr.loc[c1, c2]),
                })
        pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
        results["top_correlations"] = pairs[:10]
    else:
        results["top_correlations"] = []

    # ── 4. Category / segment breakdown ─────────────────────────────
    target_col = _detect_target_column(df)
    results["target_column"] = target_col

    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()
    category_breakdowns = {}
    if target_col and categorical_cols:
        for cat_col in categorical_cols[:5]:  # Limit to first 5 categoricals
            try:
                breakdown = (
                    df.groupby(cat_col)[target_col]
                    .agg(["sum", "mean", "count"])
                    .sort_values("sum", ascending=False)
                    .head(10)
                    .reset_index()
                )
                category_breakdowns[cat_col] = [
                    {
                        "category": str(row[cat_col]),
                        "total": _safe_json(row["sum"]),
                        "average": _safe_json(row["mean"]),
                        "count": int(row["count"]),
                    }
                    for _, row in breakdown.iterrows()
                ]
            except Exception:
                continue
    results["category_breakdowns"] = category_breakdowns

    # ── 5. ML Model: R² and Feature Importance ──────────────────────
    ml_results = _train_and_evaluate(df, target_col, numeric_cols, categorical_cols)
    results["ml_model"] = ml_results

    # ── 6. Data preview (first 8 rows) ──────────────────────────────
    preview = df.head(8).fillna("").to_dict(orient="records")
    # Convert any remaining numpy types
    clean_preview = []
    for row in preview:
        clean_preview.append({k: _safe_json(v) for k, v in row.items()})
    results["preview"] = clean_preview

    return results


def _train_and_evaluate(
    df: pd.DataFrame,
    target_col: str | None,
    numeric_cols: list[str],
    categorical_cols: list[str],
) -> dict:
    """Train a RandomForest to predict the target. Return R², MAE, feature importances."""
    if target_col is None or len(df) < 20:
        return {"status": "skipped", "reason": "No suitable target column or too few rows."}

    try:
        # Prepare feature matrix
        feature_cols = [c for c in numeric_cols if c != target_col]

        # Encode categoricals (label encoding for tree-based model)
        encoders = {}
        encoded_cat_cols = []
        for col in categorical_cols:
            if df[col].nunique() > 50:
                continue  # Skip high-cardinality columns
            le = LabelEncoder()
            col_name = f"{col}_encoded"
            df_copy = df.copy()
            df_copy[col_name] = le.fit_transform(df[col].astype(str))
            df = df_copy
            encoders[col] = le
            encoded_cat_cols.append(col_name)
            feature_cols.append(col_name)

        if len(feature_cols) < 1:
            return {"status": "skipped", "reason": "Not enough feature columns."}

        # Drop rows with NaN in features or target
        working = df[feature_cols + [target_col]].dropna()
        if len(working) < 20:
            return {"status": "skipped", "reason": "Not enough clean rows after dropping NaN."}

        X = working[feature_cols]
        y = working[target_col]

        # Train/test split (80/20, no shuffle for time-series-like data)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model = RandomForestRegressor(
            n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

        # Feature importances
        importances = model.feature_importances_
        feature_importance = []
        for col, imp in sorted(zip(feature_cols, importances), key=lambda x: -x[1]):
            # Strip "_encoded" suffix for display
            display_name = col.replace("_encoded", "")
            feature_importance.append({
                "feature": display_name,
                "importance": _safe_json(imp),
                "importance_pct": _safe_json(imp * 100),
            })

        return {
            "status": "success",
            "target_column": target_col,
            "r2_score": _safe_json(r2),
            "mae": _safe_json(mae),
            "rmse": _safe_json(rmse),
            "train_rows": len(X_train),
            "test_rows": len(X_test),
            "feature_importance": feature_importance,
        }

    except Exception as e:
        logger.exception("ML model training failed")
        return {"status": "error", "reason": str(e)}


def format_ml_summary_for_llm(results: dict) -> str:
    """
    Format the hard ML metrics into a concise text block that can be
    passed to Ollama/Groq so the AI writes an executive summary from
    FACTS, not guesses.
    """
    lines = []
    prof = results.get("profiling", {})
    lines.append(f"Dataset: {prof.get('rows', '?')} rows × {prof.get('columns', '?')} columns")
    lines.append(f"Missing values: {prof.get('missing_values_total', 0)}")
    lines.append(f"Duplicate rows: {prof.get('duplicate_rows', 0)}")

    ml = results.get("ml_model", {})
    if ml.get("status") == "success":
        lines.append(f"\nML Model (RandomForest) predicting '{ml['target_column']}':")
        lines.append(f"  R² Score: {ml['r2_score']}")
        lines.append(f"  MAE: {ml['mae']}")
        lines.append(f"  RMSE: {ml['rmse']}")
        lines.append(f"  Train/Test split: {ml['train_rows']}/{ml['test_rows']} rows")
        lines.append("\nTop features driving predictions:")
        for fi in ml.get("feature_importance", [])[:8]:
            lines.append(f"  - {fi['feature']}: {fi['importance_pct']:.1f}%")

    corrs = results.get("top_correlations", [])
    if corrs:
        lines.append("\nStrongest correlations:")
        for c in corrs[:5]:
            lines.append(f"  - {c['feature_1']} ↔ {c['feature_2']}: {c['correlation']:.3f}")

    breakdowns = results.get("category_breakdowns", {})
    for cat_name, items in list(breakdowns.items())[:2]:
        lines.append(f"\nTop segments by '{cat_name}':")
        for item in items[:5]:
            lines.append(f"  - {item['category']}: total={item['total']}, avg={item['average']}, count={item['count']}")

    return "\n".join(lines)

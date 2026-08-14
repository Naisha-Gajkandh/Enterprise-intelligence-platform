import { http, request } from './client.js';
import { mockUploadAnalysis } from './mock/mockData.js';

// Maps to app/routers/upload.py: /analyze (multipart CSV/XLSX upload)
// Backend now returns: ML preprocessing (R², feature importance) + DB ingestion + AI summary

export async function analyzeDataset(file, onProgress) {
  const form = new FormData();
  form.append('file', file);

  const result = await request(
    () =>
      http.post('/upload/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min for large files + ML training
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      }),
    () => ({ ...mockUploadAnalysis, filename: file?.name || mockUploadAnalysis.filename }),
    { disableFallback: true }
  );

  if (result.source === 'live' && result.data) {
    const raw = result.data;

    // The backend now returns a rich structured response
    return {
      source: 'live',
      data: {
        filename: raw.filename || file?.name || 'uploaded_dataset.csv',
        rows: raw.rows_processed || 0,
        columns: Array.isArray(raw.columns) ? raw.columns.length : 0,
        column_names: raw.columns || [],

        // Profiling
        missing_values_total: raw.profiling?.missing_values_total || 0,
        duplicate_rows: raw.profiling?.duplicate_rows || 0,
        schema: raw.profiling?.schema || [],

        // ML Model results
        ml_model: raw.ml_model || null,

        // Correlations
        top_correlations: raw.top_correlations || [],

        // Category breakdowns
        category_breakdowns: raw.category_breakdowns || {},

        // Numeric summary
        numeric_summary: raw.numeric_summary || [],

        // Preview
        preview: raw.preview || [],

        // DB ingestion
        ingestion: raw.ingestion || {},

        // AI summary (written from hard ML metrics)
        ai_summary: raw.ai_summary || 'No AI summary available.',

        // Keep legacy field for backward compat
        ollama_insight: raw.ai_summary || 'No AI summary available.',
      }
    };
  }

  return result;
}

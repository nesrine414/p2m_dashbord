"""
Petit serveur HTTP local pour exposer la prediction XGBoost au backend Node.

Lancement :
    python serve_xgboost.py

Endpoint :
    POST /predict
    Body JSON : { "rows": [ ... ] }
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os

import pandas as pd

from predict_xgboost import predict_dataframe


HOST = os.getenv("ML_SERVER_HOST", "127.0.0.1")
PORT = int(os.getenv("ML_SERVER_PORT", "8001"))


class PredictionHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        return

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(
                200,
                {
                    "status": "ok",
                    "model": "xgboost_anticipation_strict_binary",
                },
            )
            return

        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/predict":
            self._send_json(404, {"error": "Not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body or "{}")
            rows = payload.get("rows", [])

            if not isinstance(rows, list) or not rows:
                self._send_json(400, {"error": "rows is required"})
                return

            df = pd.DataFrame(rows)
            output_df = predict_dataframe(df)

            self._send_json(
                200,
                {
                    "provider": "xgboost",
                    "predictions": output_df.to_dict(orient="records"),
                    "summary": {
                        "total": int(len(output_df)),
                        "normal": int((output_df["prediction_label"] == "Normal").sum()),
                        "panne": int((output_df["prediction_label"] == "Panne").sum()),
                    },
                },
            )
        except Exception as error:
            self._send_json(500, {"error": str(error)})


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), PredictionHandler)
    print(f"ML server running on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()

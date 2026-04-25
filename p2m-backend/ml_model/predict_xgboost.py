"""
Prediction avec le modele XGBoost entraine pour l'anticipation de panne.

Usage:
    python predict_xgboost.py
    python predict_xgboost.py --input mon_fichier.csv
    python predict_xgboost.py --input mon_fichier.csv --output predictions.csv
"""

from pathlib import Path
import argparse
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, f1_score, recall_score

from data import BASE_DIR, OUTPUT_DIR, TARGET_COL, clean_data, feature_engineering


MODEL_DIR = BASE_DIR / "models" / "xgboost_anticipation_strict_binary"
MODEL_PATH = MODEL_DIR / "xgboost_model.pkl"
TRAINING_SUMMARY_PATH = MODEL_DIR / "training_summary.json"
DEFAULT_INPUT_PATH = BASE_DIR / "otdr_anomaly_dataset_v2.csv"
DEFAULT_OUTPUT_PATH = BASE_DIR / "predictions" / "xgboost_predictions.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prediction de panne avec XGBoost")
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT_PATH,
        help="Chemin du CSV brut a predire",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Chemin du CSV de sortie",
    )
    return parser.parse_args()


def load_artifacts() -> tuple[object, dict, dict, object]:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Modele introuvable : {MODEL_PATH}")
    if not TRAINING_SUMMARY_PATH.exists():
        raise FileNotFoundError(f"Resume entrainement introuvable : {TRAINING_SUMMARY_PATH}")

    model = joblib.load(MODEL_PATH)
    encoders = joblib.load(OUTPUT_DIR / "encoders.pkl")
    scaler = joblib.load(OUTPUT_DIR / "scaler.pkl")

    with TRAINING_SUMMARY_PATH.open("r", encoding="utf-8") as file:
        training_summary = json.load(file)

    return model, encoders, training_summary, scaler


def transform_categoricals(df: pd.DataFrame, encoders: dict) -> pd.DataFrame:
    df = df.copy()

    for col, encoder in encoders.items():
        if col not in df.columns:
            continue

        if hasattr(encoder, "categories_"):
            df[col] = encoder.transform(df[[col]]).ravel().astype(float)
            continue

        if hasattr(encoder, "classes_"):
            class_map = {label: idx for idx, label in enumerate(encoder.classes_)}
            df[col] = df[col].astype(str).map(class_map).fillna(-1).astype(int)

    return df


def prepare_features(
    raw_df: pd.DataFrame,
    encoders: dict,
    scaler,
    used_features: list[str],
) -> pd.DataFrame:
    df = clean_data(raw_df)
    df = feature_engineering(df)
    df = transform_categoricals(df, encoders)

    if TARGET_COL in df.columns:
        df = df.drop(columns=[TARGET_COL])

    scale_cols = list(getattr(scaler, "feature_names_in_", []))
    missing_scale_cols = [col for col in scale_cols if col not in df.columns]
    for col in missing_scale_cols:
        df[col] = 0.0

    if scale_cols:
        df.loc[:, scale_cols] = scaler.transform(df[scale_cols])

    missing_used_features = [col for col in used_features if col not in df.columns]
    for col in missing_used_features:
        df[col] = 0.0

    X = df[used_features].copy()
    return X


def evaluate_if_possible(raw_df: pd.DataFrame, predictions: np.ndarray) -> None:
    if TARGET_COL not in raw_df.columns:
        return

    y_true = (raw_df[TARGET_COL].astype(int) > 0).astype(int)
    y_pred = predictions.astype(int)

    accuracy = accuracy_score(y_true, y_pred)
    f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)
    recall_macro = recall_score(y_true, y_pred, average="macro", zero_division=0)

    print("\nEvaluation sur ce fichier :")
    print(f"  accuracy     : {accuracy:.4f}")
    print(f"  f1_macro     : {f1_macro:.4f}")
    print(f"  recall_macro : {recall_macro:.4f}")
    print("\nClassification report :")
    print(classification_report(y_true, y_pred, target_names=["Normal", "Panne"], zero_division=0))


def build_output(raw_df: pd.DataFrame, predictions: np.ndarray, probabilities: np.ndarray) -> pd.DataFrame:
    output = raw_df.copy()
    output["prediction_binary"] = predictions.astype(int)
    output["prediction_label"] = np.where(predictions == 1, "Panne", "Normal")
    output["probability_panne"] = probabilities.round(6)
    output["probability_normal"] = (1.0 - probabilities).round(6)
    return output


def predict_dataframe(raw_df: pd.DataFrame) -> pd.DataFrame:
    model, encoders, training_summary, scaler = load_artifacts()
    used_features = training_summary["used_features"]

    X = prepare_features(raw_df, encoders, scaler, used_features)

    predictions = model.predict(X)
    predictions = np.asarray(predictions).reshape(-1).astype(int)

    probabilities = model.predict_proba(X)[:, 1]
    return build_output(raw_df, predictions, probabilities)


def main() -> None:
    args = parse_args()
    input_path = args.input.resolve()
    output_path = args.output.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 60)
    print("  PREDICTION XGBOOST - PANNE FIBRE")
    print("=" * 60)
    print(f"Input  : {input_path}")
    print(f"Output : {output_path}")

    if not input_path.exists():
        raise FileNotFoundError(f"Fichier introuvable : {input_path}")

    raw_df = pd.read_csv(input_path)
    print(f"Lignes a predire : {len(raw_df):,}")

    output_df = predict_dataframe(raw_df)
    output_df.to_csv(output_path, index=False)

    counts = output_df["prediction_label"].value_counts().to_dict()
    print("\nResume predictions :")
    print(f"  Normal : {counts.get('Normal', 0):,}")
    print(f"  Panne  : {counts.get('Panne', 0):,}")
    print(f"  Fichier sauvegarde : {output_path}")

    evaluate_if_possible(raw_df, output_df["prediction_binary"].to_numpy())


if __name__ == "__main__":
    main()

"""
Entrainement d'un Random Forest pour la prediction des pannes de fibre.

Par defaut, le script entraine un modele binaire en mode anticipation :
    0 Normal
    1 Panne

Options utiles :
    TASK_MODE = "multiclass" ou "binary"
    PREDICTION_MODE = "anticipation" ou "diagnostic"
    ANTICIPATION_PROFILE = "standard" ou "strict"
"""

from pathlib import Path
import json

import joblib
import matplotlib
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold
from sklearn.utils.class_weight import compute_class_weight

from data import LABEL_NAMES, OUTPUT_DIR, load_preprocessed, run_pipeline

matplotlib.use("Agg")
import matplotlib.pyplot as plt


BASE_DIR = Path(__file__).resolve().parent

TASK_MODE = "binary"  # "multiclass" ou "binary"
PREDICTION_MODE = "anticipation"  # "anticipation" ou "diagnostic"
ANTICIPATION_PROFILE = "strict"  # "standard" ou "strict"

STATUS_LEAKAGE_COLUMNS = [
    "rtu_status",
    "power_supply",
    "otdr_avail",
    "fiber_status",
    "route_status",
    "test_result",
    "alarm_type",
    "severity",
    "alarm_status",
    "mttr_hours",
]

DIAGNOSTIC_SIGNAL_COLUMNS = [
    "splice_loss_max",
    "splice_end_ratio",
    "checksum_int",
    "orl_db",
    "refl_loss_min",
    "refl_abs",
    "att_per_km",
    "end_loss_db",
    "dynamic_range_db",
    "total_loss_db",
    "attenuation_db",
    "orl_per_km",
    "noise_floor",
    "slope_avg_db_km",
    "slope_deviation",
    "event_density",
    "num_events",
]

model_dir_name = f"random_forest_{PREDICTION_MODE}"
if PREDICTION_MODE == "anticipation":
    model_dir_name += f"_{ANTICIPATION_PROFILE}"
model_dir_name += f"_{TASK_MODE}"

MODEL_DIR = BASE_DIR / "models" / model_dir_name
MODEL_DIR.mkdir(parents=True, exist_ok=True)

RF_PARAMS = {
    "n_estimators": 200,
    "max_depth": 15,
    "min_samples_leaf": 2,
    "max_features": "sqrt",
    "class_weight": "balanced",
    "random_state": 42,
    "n_jobs": 1,
}

CV_FOLDS = 3


def ensure_preprocessed_data() -> dict:
    required_files = [
        OUTPUT_DIR / "X_train.csv",
        OUTPUT_DIR / "X_val.csv",
        OUTPUT_DIR / "X_test.csv",
        OUTPUT_DIR / "y_train.csv",
        OUTPUT_DIR / "y_val.csv",
        OUTPUT_DIR / "y_test.csv",
    ]

    if all(path.exists() for path in required_files):
        print("Chargement des donnees pretraitees depuis preprocessed/")
        return load_preprocessed()

    print("Artefacts introuvables. Lancement du pretraitement...")
    return run_pipeline()


def prepare_targets(data: dict, task_mode: str):
    y_train = data["y_train"].astype(int).copy()
    y_val = data["y_val"].astype(int).copy()
    y_test = data["y_test"].astype(int).copy()

    if task_mode == "binary":
        y_train = (y_train > 0).astype(int)
        y_val = (y_val > 0).astype(int)
        y_test = (y_test > 0).astype(int)
        label_names = {0: "Normal", 1: "Panne"}
    else:
        label_names = LABEL_NAMES

    return y_train, y_val, y_test, label_names


def select_features(
    X_train: pd.DataFrame,
    X_val: pd.DataFrame,
    X_test: pd.DataFrame,
    prediction_mode: str,
    anticipation_profile: str,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, list[str], list[str]]:
    if prediction_mode == "diagnostic":
        kept_features = list(X_train.columns)
        return X_train.copy(), X_val.copy(), X_test.copy(), kept_features, []

    dropped_columns = [col for col in STATUS_LEAKAGE_COLUMNS if col in X_train.columns]
    if anticipation_profile == "strict":
        dropped_columns.extend([col for col in DIAGNOSTIC_SIGNAL_COLUMNS if col in X_train.columns])

    dropped_columns = list(dict.fromkeys(dropped_columns))
    X_train_selected = X_train.drop(columns=dropped_columns).copy()
    X_val_selected = X_val.drop(columns=dropped_columns).copy()
    X_test_selected = X_test.drop(columns=dropped_columns).copy()
    kept_features = list(X_train_selected.columns)

    return X_train_selected, X_val_selected, X_test_selected, kept_features, dropped_columns


def build_class_weights(y_train: pd.Series) -> dict:
    classes = np.array(sorted(y_train.unique().tolist()))
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    return {int(cls): float(weight) for cls, weight in zip(classes, weights)}


def evaluate_model(model, X: pd.DataFrame, y: pd.Series, labels: list[int]) -> tuple[dict, dict, list[int]]:
    y_pred = model.predict(X)

    metrics = {
        "accuracy": float(accuracy_score(y, y_pred)),
        "precision_macro": float(precision_score(y, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y, y_pred, average="macro", zero_division=0)),
        "precision_weighted": float(
            precision_score(y, y_pred, average="weighted", zero_division=0)
        ),
        "recall_weighted": float(recall_score(y, y_pred, average="weighted", zero_division=0)),
        "f1_weighted": float(f1_score(y, y_pred, average="weighted", zero_division=0)),
    }

    report = classification_report(
        y,
        y_pred,
        labels=labels,
        output_dict=True,
        zero_division=0,
    )

    return metrics, report, y_pred.tolist()


def run_cross_validation(
    X: pd.DataFrame,
    y: pd.Series,
    labels: list[int],
    n_splits: int = CV_FOLDS,
) -> tuple[list[dict], dict]:
    splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    fold_results: list[dict] = []

    for fold_idx, (train_idx, val_idx) in enumerate(splitter.split(X, y), start=1):
        X_fold_train = X.iloc[train_idx]
        X_fold_val = X.iloc[val_idx]
        y_fold_train = y.iloc[train_idx]
        y_fold_val = y.iloc[val_idx]

        fold_params = RF_PARAMS.copy()
        fold_params["class_weight"] = build_class_weights(y_fold_train)

        model = RandomForestClassifier(**fold_params)
        model.fit(X_fold_train, y_fold_train)

        metrics, _, _ = evaluate_model(model, X_fold_val, y_fold_val, labels)
        metrics["fold"] = fold_idx
        metrics["train_size"] = int(len(X_fold_train))
        metrics["val_size"] = int(len(X_fold_val))
        fold_results.append(metrics)

        print(
            f"  Fold {fold_idx}/{n_splits}"
            f" - accuracy: {metrics['accuracy']:.4f}"
            f" | f1_macro: {metrics['f1_macro']:.4f}"
            f" | recall_macro: {metrics['recall_macro']:.4f}"
        )

    summary = {
        metric: {
            "mean": float(np.mean([fold[metric] for fold in fold_results])),
            "std": float(np.std([fold[metric] for fold in fold_results])),
        }
        for metric in [
            "accuracy",
            "precision_macro",
            "recall_macro",
            "f1_macro",
            "precision_weighted",
            "recall_weighted",
            "f1_weighted",
        ]
    }

    return fold_results, summary


def save_metrics(metrics: dict, report: dict, split_name: str) -> None:
    metrics_path = MODEL_DIR / f"{split_name}_metrics.json"
    report_path = MODEL_DIR / f"{split_name}_classification_report.json"

    with metrics_path.open("w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)

    with report_path.open("w", encoding="utf-8") as file:
        json.dump(report, file, indent=2)


def save_cross_validation_results(fold_results: list[dict], cv_summary: dict) -> None:
    fold_df = pd.DataFrame(fold_results)
    fold_df.to_csv(MODEL_DIR / "cross_validation_folds.csv", index=False)

    with (MODEL_DIR / "cross_validation_summary.json").open("w", encoding="utf-8") as file:
        json.dump(cv_summary, file, indent=2)


def save_confusion_matrix(
    y_true: pd.Series,
    y_pred: list[int],
    labels: list[int],
    label_names: dict[int, str],
    split_name: str,
) -> None:
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    tick_labels = [label_names[label].replace("_", " ") for label in labels]

    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=tick_labels,
        yticklabels=tick_labels,
    )
    plt.title(f"Confusion Matrix - {split_name}")
    plt.xlabel("Prediction")
    plt.ylabel("Reel")
    plt.tight_layout()
    plt.savefig(MODEL_DIR / f"{split_name}_confusion_matrix.png", dpi=150, bbox_inches="tight")
    plt.close()


def save_feature_importance(model, feature_names: list[str]) -> None:
    importance_df = pd.DataFrame(
        {
            "feature": feature_names,
            "importance": model.feature_importances_,
        }
    ).sort_values("importance", ascending=False)

    importance_df.to_csv(MODEL_DIR / "feature_importance.csv", index=False)

    top_n = importance_df.head(15).sort_values("importance", ascending=True)
    plt.figure(figsize=(10, 6))
    plt.barh(top_n["feature"], top_n["importance"], color="#2f6db2")
    plt.title("Top 15 Feature Importances - Random Forest")
    plt.xlabel("Importance")
    plt.tight_layout()
    plt.savefig(MODEL_DIR / "feature_importance.png", dpi=150, bbox_inches="tight")
    plt.close()


def save_training_summary(
    task_mode: str,
    prediction_mode: str,
    anticipation_profile: str,
    class_weights: dict,
    label_names: dict[int, str],
    kept_features: list[str],
    dropped_columns: list[str],
    cv_summary: dict,
    val_metrics: dict,
    test_metrics: dict,
) -> None:
    summary = {
        "task_mode": task_mode,
        "prediction_mode": prediction_mode,
        "anticipation_profile": anticipation_profile,
        "model_type": "RandomForestClassifier",
        "model_params": RF_PARAMS,
        "class_weights": class_weights,
        "labels": label_names,
        "n_features": len(kept_features),
        "used_features": kept_features,
        "dropped_columns": dropped_columns,
        "cross_validation": cv_summary,
        "validation_metrics": val_metrics,
        "test_metrics": test_metrics,
    }

    with (MODEL_DIR / "training_summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, indent=2)


def main() -> None:
    print("\n" + "=" * 60)
    print("  ENTRAINEMENT RANDOM FOREST - PREDICTION PANNE FIBRE")
    print("=" * 60)

    data = ensure_preprocessed_data()

    X_train = data["X_train"]
    X_val = data["X_val"]
    X_test = data["X_test"]

    y_train, y_val, y_test, label_names = prepare_targets(data, TASK_MODE)
    labels = sorted(label_names.keys())
    X_train, X_val, X_test, feature_names, dropped_columns = select_features(
        X_train,
        X_val,
        X_test,
        PREDICTION_MODE,
        ANTICIPATION_PROFILE,
    )

    class_weights = build_class_weights(y_train)
    model_params = RF_PARAMS.copy()
    model_params["class_weight"] = class_weights

    print(f"\nMode tache      : {TASK_MODE}")
    print(f"Mode prediction : {PREDICTION_MODE}")
    print(f"Profil anticip. : {ANTICIPATION_PROFILE}")
    print(f"Train shape     : {X_train.shape}")
    print(f"Validation shape: {X_val.shape}")
    print(f"Test shape      : {X_test.shape}")
    print(f"Class weights   : {class_weights}")
    print(f"Colonnes retirees: {dropped_columns if dropped_columns else 'Aucune'}")

    print("\nCross-validation (train + validation) :")
    X_cv = pd.concat([X_train, X_val], axis=0).reset_index(drop=True)
    y_cv = pd.concat([y_train, y_val], axis=0).reset_index(drop=True)
    cv_fold_results, cv_summary = run_cross_validation(X_cv, y_cv, labels)
    save_cross_validation_results(cv_fold_results, cv_summary)

    model = RandomForestClassifier(**model_params)
    model.fit(X_train, y_train)

    val_metrics, val_report, val_pred = evaluate_model(model, X_val, y_val, labels)
    test_metrics, test_report, test_pred = evaluate_model(model, X_test, y_test, labels)

    joblib.dump(model, MODEL_DIR / "random_forest_model.pkl")
    save_metrics(val_metrics, val_report, "validation")
    save_metrics(test_metrics, test_report, "test")
    save_confusion_matrix(y_val, val_pred, labels, label_names, "validation")
    save_confusion_matrix(y_test, test_pred, labels, label_names, "test")
    save_feature_importance(model, feature_names)
    save_training_summary(
        TASK_MODE,
        PREDICTION_MODE,
        ANTICIPATION_PROFILE,
        class_weights,
        label_names,
        feature_names,
        dropped_columns,
        cv_summary,
        val_metrics,
        test_metrics,
    )

    print("\nCross-validation summary :")
    for metric, values in cv_summary.items():
        print(f"  {metric:<18} mean={values['mean']:.4f} std={values['std']:.4f}")

    print("\nValidation metrics :")
    for key, value in val_metrics.items():
        print(f"  {key:<18} {value:.4f}")

    print("\nTest metrics :")
    for key, value in test_metrics.items():
        print(f"  {key:<18} {value:.4f}")

    print(f"\nModele sauvegarde        : {MODEL_DIR / 'random_forest_model.pkl'}")
    print(f"Cross-validation         : {MODEL_DIR / 'cross_validation_summary.json'}")
    print(f"Confusion matrix test    : {MODEL_DIR / 'test_confusion_matrix.png'}")
    print(f"Feature importance       : {MODEL_DIR / 'feature_importance.csv'}")
    print(f"Resume entrainement      : {MODEL_DIR / 'training_summary.json'}")


if __name__ == "__main__":
    main()

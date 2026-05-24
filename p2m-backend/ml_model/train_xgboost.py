"""
Entrainement d'un XGBoost pour la prediction des pannes de fibre.

Par defaut, le script entraine un modele binaire en mode anticipation strict :
    0 Normal
    1 Panne
"""

from pathlib import Path
import json

import joblib
import matplotlib
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold
from xgboost import XGBClassifier

from train_random_forest import (
    ANTICIPATION_PROFILE,
    PREDICTION_MODE,
    TASK_MODE,
    ensure_preprocessed_data,
    prepare_targets,
    select_features,
)

matplotlib.use("Agg")
import matplotlib.pyplot as plt


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models" / f"xgboost_{PREDICTION_MODE}_{ANTICIPATION_PROFILE}_{TASK_MODE}"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

XGB_PARAMS = {
    "n_estimators": 300,
    "max_depth": 5,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "reg_lambda": 1.0,
    "random_state": 42,
    "n_jobs": 1,
    "tree_method": "hist",
    "eval_metric": "logloss",
}

CV_FOLDS = 3


def build_scale_pos_weight(y_train: pd.Series) -> float:
    neg_count = int((y_train == 0).sum())
    pos_count = int((y_train == 1).sum())
    if pos_count == 0:
        return 1.0
    return neg_count / pos_count


def build_model(y_train: pd.Series) -> XGBClassifier:
    model_params = XGB_PARAMS.copy()
    if TASK_MODE == "binary":
        model_params["objective"] = "binary:logistic"
        model_params["scale_pos_weight"] = build_scale_pos_weight(y_train)
    else:
        model_params["objective"] = "multi:softprob"
        model_params["num_class"] = int(y_train.nunique())
    return XGBClassifier(**model_params)


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

        model = build_model(y_fold_train)
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
    with (MODEL_DIR / f"{split_name}_metrics.json").open("w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)

    with (MODEL_DIR / f"{split_name}_classification_report.json").open("w", encoding="utf-8") as file:
        json.dump(report, file, indent=2)


def save_cross_validation_results(fold_results: list[dict], cv_summary: dict) -> None:
    pd.DataFrame(fold_results).to_csv(MODEL_DIR / "cross_validation_folds.csv", index=False)
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
        cmap="Greens",
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
    plt.barh(top_n["feature"], top_n["importance"], color="#1d8f6e")
    plt.title("Top 15 Feature Importances - XGBoost")
    plt.xlabel("Importance")
    plt.tight_layout()
    plt.savefig(MODEL_DIR / "feature_importance.png", dpi=150, bbox_inches="tight")
    plt.close()


def save_training_summary(
    label_names: dict[int, str],
    kept_features: list[str],
    dropped_columns: list[str],
    cv_summary: dict,
    val_metrics: dict,
    test_metrics: dict,
    scale_pos_weight: float | None,
) -> None:
    summary = {
        "task_mode": TASK_MODE,
        "prediction_mode": PREDICTION_MODE,
        "anticipation_profile": ANTICIPATION_PROFILE,
        "model_type": "XGBClassifier",
        "model_params": XGB_PARAMS,
        "scale_pos_weight": scale_pos_weight,
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
    print("  ENTRAINEMENT XGBOOST - PREDICTION PANNE FIBRE")
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

    scale_pos_weight = build_scale_pos_weight(y_train) if TASK_MODE == "binary" else None

    print(f"\nMode tache      : {TASK_MODE}")
    print(f"Mode prediction : {PREDICTION_MODE}")
    print(f"Profil anticip. : {ANTICIPATION_PROFILE}")
    print(f"Train shape     : {X_train.shape}")
    print(f"Validation shape: {X_val.shape}")
    print(f"Test shape      : {X_test.shape}")
    print(f"scale_pos_weight: {scale_pos_weight}")
    print(f"Colonnes retirees: {dropped_columns if dropped_columns else 'Aucune'}")

    print("\nCross-validation (train + validation) :")
    X_cv = pd.concat([X_train, X_val], axis=0).reset_index(drop=True)
    y_cv = pd.concat([y_train, y_val], axis=0).reset_index(drop=True)
    cv_fold_results, cv_summary = run_cross_validation(X_cv, y_cv, labels)
    save_cross_validation_results(cv_fold_results, cv_summary)

    model = build_model(y_train)
    model.fit(X_train, y_train)

    val_metrics, val_report, val_pred = evaluate_model(model, X_val, y_val, labels)
    test_metrics, test_report, test_pred = evaluate_model(model, X_test, y_test, labels)

    joblib.dump(model, MODEL_DIR / "xgboost_model.pkl")
    save_metrics(val_metrics, val_report, "validation")
    save_metrics(test_metrics, test_report, "test")
    save_confusion_matrix(y_val, val_pred, labels, label_names, "validation")
    save_confusion_matrix(y_test, test_pred, labels, label_names, "test")
    save_feature_importance(model, feature_names)
    save_training_summary(
        label_names,
        feature_names,
        dropped_columns,
        cv_summary,
        val_metrics,
        test_metrics,
        scale_pos_weight,
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

    print(f"\nModele sauvegarde        : {MODEL_DIR / 'xgboost_model.pkl'}")
    print(f"Cross-validation         : {MODEL_DIR / 'cross_validation_summary.json'}")
    print(f"Confusion matrix test    : {MODEL_DIR / 'test_confusion_matrix.png'}")
    print(f"Feature importance       : {MODEL_DIR / 'feature_importance.csv'}")
    print(f"Resume entrainement      : {MODEL_DIR / 'training_summary.json'}")


if __name__ == "__main__":
    main()

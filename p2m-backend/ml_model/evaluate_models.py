"""
Compare les modeles ML entraines pour l'anticipation de panne.

Le script lit les rapports deja produits par les scripts d'entrainement et
genere un resume unique axe sur la classe critique "Panne".

Usage:
    python ml_model/evaluate_models.py
"""

from __future__ import annotations

from pathlib import Path
import json


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
OUTPUT_PATH = BASE_DIR / "predictions" / "model_evaluation_summary.json"

MODEL_DIRS = {
    "xgboost": MODELS_DIR / "xgboost_anticipation_strict_binary",
    "random_forest": MODELS_DIR / "random_forest_anticipation_strict_binary",
    "catboost": MODELS_DIR / "catboost_anticipation_strict_binary",
}


def load_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"Fichier introuvable : {path}")

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def round_metric(value: float | int | None) -> float | None:
    if value is None:
        return None

    return round(float(value), 4)


def read_model_summary(name: str, model_dir: Path) -> dict:
    metrics = load_json(model_dir / "test_metrics.json")
    report = load_json(model_dir / "test_classification_report.json")
    training_summary = load_json(model_dir / "training_summary.json")

    panne_report = report.get("1", {})
    normal_report = report.get("0", {})

    return {
        "model": name,
        "model_type": training_summary.get("model_type", name),
        "accuracy": round_metric(metrics.get("accuracy")),
        "f1_macro": round_metric(metrics.get("f1_macro")),
        "recall_macro": round_metric(metrics.get("recall_macro")),
        "panne_precision": round_metric(panne_report.get("precision")),
        "panne_recall": round_metric(panne_report.get("recall")),
        "panne_f1": round_metric(panne_report.get("f1-score")),
        "panne_support": int(panne_report.get("support", 0)),
        "normal_precision": round_metric(normal_report.get("precision")),
        "normal_recall": round_metric(normal_report.get("recall")),
        "normal_f1": round_metric(normal_report.get("f1-score")),
        "normal_support": int(normal_report.get("support", 0)),
        "n_features": int(training_summary.get("n_features", 0)),
        "confusion_matrix_png": str(model_dir / "test_confusion_matrix.png"),
        "feature_importance_csv": str(model_dir / "feature_importance.csv"),
    }


def rank_models(rows: list[dict]) -> list[dict]:
    # Priorite metier: ne pas rater les pannes, puis garder un bon F1 panne.
    return sorted(
        rows,
        key=lambda row: (
            row["panne_recall"] or 0,
            row["panne_f1"] or 0,
            row["accuracy"] or 0,
        ),
        reverse=True,
    )


def build_recommendations(best: dict, rows: list[dict]) -> list[str]:
    recommendations = [
        (
            f"Meilleur modele selon recall panne: {best['model']} "
            f"(recall={best['panne_recall']}, f1={best['panne_f1']})."
        )
    ]

    if (best["panne_recall"] or 0) < 0.7:
        recommendations.append(
            "Recall panne faible: augmenter les exemples de pannes, baisser le seuil de decision "
            "ou penaliser davantage les faux negatifs."
        )

    if all((row["normal_recall"] or 0) > 0.9 for row in rows):
        recommendations.append(
            "Les modeles detectent mieux les cas normaux que les pannes; enrichir les scenarios "
            "RTU offline, fibre degradee, echec OTDR et alarmes critiques."
        )

    recommendations.append(
        "Pour la prochaine iteration, comparer aussi plusieurs seuils de probabilite "
        "(0.30, 0.35, 0.40, 0.50) sur la classe Panne."
    )

    return recommendations


def main() -> None:
    rows = [read_model_summary(name, model_dir) for name, model_dir in MODEL_DIRS.items()]
    ranked = rank_models(rows)

    output = {
        "ranking_rule": "Tri par recall de la classe Panne, puis F1 Panne, puis accuracy.",
        "best_model": ranked[0]["model"],
        "models": ranked,
        "recommendations": build_recommendations(ranked[0], ranked),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(output, file, indent=2, ensure_ascii=False)

    print("\nComparaison des modeles - classe critique Panne")
    print("-" * 72)
    print(
        f"{'Modele':<16} {'Acc':>7} {'Recall Panne':>14} "
        f"{'Precision Panne':>17} {'F1 Panne':>10}"
    )
    print("-" * 72)

    for row in ranked:
        print(
            f"{row['model']:<16} {row['accuracy']:>7.4f} {row['panne_recall']:>14.4f} "
            f"{row['panne_precision']:>17.4f} {row['panne_f1']:>10.4f}"
        )

    print("\nRecommandations")
    for recommendation in output["recommendations"]:
        print(f"- {recommendation}")

    print(f"\nRapport JSON: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

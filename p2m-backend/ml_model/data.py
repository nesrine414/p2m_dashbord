"""
NQMS - Pretraitement des donnees OTDR

Etape 2 du pipeline ML - Detection d'anomalies

Input:
    otdr_anomaly_dataset_v2.csv

Output:
    X_train, X_val, X_test, y_train, y_val, y_test
    + encoders / scaler / class_weights / feature_names sauvegardes
"""

from pathlib import Path
import warnings

import joblib
import matplotlib
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder, StandardScaler
from sklearn.utils.class_weight import compute_class_weight

matplotlib.use("Agg")
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "otdr_anomaly_dataset_v2.csv"
OUTPUT_DIR = BASE_DIR / "preprocessed"
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE = 0.15
VAL_SIZE = 0.15
TARGET_COL = "label"

LABEL_NAMES = {
    0: "Normal",
    1: "Fiber_Cut",
    2: "High_Loss",
    3: "RTU_Down",
    4: "Degraded",
    5: "Broken",
}


def load_data(path: Path) -> pd.DataFrame:
    print("\n" + "=" * 60)
    print("  ETAPE 1 - Chargement des donnees")
    print("=" * 60)

    if not path.exists():
        raise FileNotFoundError(f"Fichier introuvable : {path}")

    df = pd.read_csv(path)
    print(f"  OK {len(df):,} lignes chargees | {df.shape[1]} colonnes")
    print(f"  OK Colonnes : {list(df.columns)}")

    if "label_name" in df.columns:
        print("\n  Distribution des labels :")
        print(df["label_name"].value_counts().to_string(index=True))

    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    print("\n" + "=" * 60)
    print("  ETAPE 2 - Nettoyage")
    print("=" * 60)

    df = df.copy()

    cols_to_drop = ["sample_id", "label_name", "test_date"]
    existing_cols_to_drop = [col for col in cols_to_drop if col in df.columns]
    if existing_cols_to_drop:
        df = df.drop(columns=existing_cols_to_drop)
        print(f"  OK Colonnes supprimees : {existing_cols_to_drop}")

    missing = df.isnull().sum()
    missing = missing[missing > 0]
    if not missing.empty:
        print("\n  Valeurs manquantes detectees :")
        print(missing.to_string())

        for col in ["alarm_type", "severity", "alarm_status"]:
            if col in df.columns:
                df[col] = df[col].fillna("None")
                print(f"  OK {col} : NULL -> 'None'")

        if "mttr_hours" in df.columns:
            df["mttr_hours"] = df["mttr_hours"].fillna(0.0)
            print("  OK mttr_hours : NULL -> 0.0")
    else:
        print("  OK Aucune valeur manquante")

    n_dup = int(df.duplicated().sum())
    if n_dup > 0:
        df = df.drop_duplicates().reset_index(drop=True)
        print(f"  OK {n_dup} doublons supprimes")
    else:
        print("  OK Aucun doublon")

    print(f"\n  OK Shape apres nettoyage : {df.shape}")
    return df


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    print("\n" + "=" * 60)
    print("  ETAPE 3 - Feature engineering")
    print("=" * 60)

    df = df.copy()

    df["att_per_km"] = np.where(
        df["length_km"] > 0,
        df["attenuation_db"] / df["length_km"],
        0.0,
    ).round(4)
    print("  OK att_per_km = attenuation_db / length_km")

    nominal = {1310.0: 0.35, 1550.0: 0.20, 1625.0: 0.18}
    df["slope_deviation"] = (
        df["slope_avg_db_km"] - df["wavelength_nm"].map(nominal).fillna(0.0)
    ).round(4)
    print("  OK slope_deviation = slope_avg_db_km - nominal_att_coeff")

    df["splice_end_ratio"] = np.where(
        df["end_loss_db"] > 0,
        df["splice_loss_max"] / df["end_loss_db"],
        0.0,
    ).round(4)
    print("  OK splice_end_ratio = splice_loss_max / end_loss_db")

    df["refl_abs"] = df["refl_loss_min"].abs().round(3)
    print("  OK refl_abs = abs(refl_loss_min)")

    df["orl_per_km"] = np.where(
        df["length_km"] > 0,
        df["orl_db"] / df["length_km"],
        0.0,
    ).round(4)
    print("  OK orl_per_km = orl_db / length_km")

    if "checksum_valid" in df.columns:
        df["checksum_int"] = df["checksum_valid"].astype(int)
        df = df.drop(columns=["checksum_valid"])
        print("  OK checksum_valid -> checksum_int")

    df["event_density"] = np.where(
        df["length_km"] > 0,
        df["num_events"] / df["length_km"],
        0.0,
    ).round(4)
    print("  OK event_density = num_events / length_km")

    print(f"\n  OK Shape apres feature engineering : {df.shape}")
    return df


def encode_categoricals(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    print("\n" + "=" * 60)
    print("  ETAPE 4 - Encodage categoriel")
    print("=" * 60)

    df = df.copy()
    encoders: dict[str, object] = {}

    ordinal_cols = {
        "rtu_status": ["Online", "Unreachable", "Offline"],
        "power_supply": ["Normal", "Failure"],
        "otdr_avail": ["Ready", "Busy", "Fault"],
        "fiber_status": ["Normal", "Degraded", "Broken"],
        "route_status": ["Active", "Skipped", "Inactive"],
        "test_result": ["Pass", "Fail"],
        "severity": ["None", "Minor", "Major", "Critical"],
        "alarm_status": ["None", "Cleared", "Acknowledged", "Active"],
    }

    for col, categories in ordinal_cols.items():
        if col not in df.columns:
            continue
        enc = OrdinalEncoder(
            categories=[categories],
            handle_unknown="use_encoded_value",
            unknown_value=-1,
        )
        df[col] = enc.fit_transform(df[[col]]).ravel().astype(float)
        encoders[col] = enc
        print(f"  OK OrdinalEncoder -> {col} : {categories}")

    nominal_cols = ["supplier", "fiber_type", "build_condition", "alarm_type", "test_mode"]
    for col in nominal_cols:
        if col not in df.columns:
            continue
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        print(f"  OK LabelEncoder -> {col} : {list(le.classes_)}")

    joblib.dump(encoders, OUTPUT_DIR / "encoders.pkl")
    print(f"\n  OK Encodeurs sauvegardes -> {OUTPUT_DIR / 'encoders.pkl'}")

    return df, encoders


def split_data(df: pd.DataFrame):
    print("\n" + "=" * 60)
    print("  ETAPE 5 - Train / Val / Test split")
    print("=" * 60)

    if TARGET_COL not in df.columns:
        raise KeyError(f"Colonne cible introuvable : {TARGET_COL}")

    X = df.drop(columns=[TARGET_COL])
    y = df[TARGET_COL]

    print(f"  Features (X) : {X.shape[1]} colonnes")
    print(f"  Target  (y)  : {y.nunique()} classes")
    print(f"  Liste features : {list(X.columns)}")

    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    val_ratio = VAL_SIZE / (1 - TEST_SIZE)
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval,
        y_trainval,
        test_size=val_ratio,
        random_state=RANDOM_STATE,
        stratify=y_trainval,
    )

    print(f"\n  OK Train      : {len(X_train):>7,} lignes ({len(X_train) / len(df) * 100:.1f}%)")
    print(f"  OK Validation : {len(X_val):>7,} lignes ({len(X_val) / len(df) * 100:.1f}%)")
    print(f"  OK Test       : {len(X_test):>7,} lignes ({len(X_test) / len(df) * 100:.1f}%)")

    return (
        X_train.reset_index(drop=True),
        X_val.reset_index(drop=True),
        X_test.reset_index(drop=True),
        y_train.reset_index(drop=True),
        y_val.reset_index(drop=True),
        y_test.reset_index(drop=True),
    )


def scale_features(X_train: pd.DataFrame, X_val: pd.DataFrame, X_test: pd.DataFrame):
    print("\n" + "=" * 60)
    print("  ETAPE 6 - Normalisation (StandardScaler)")
    print("=" * 60)

    X_train = X_train.copy()
    X_val = X_val.copy()
    X_test = X_test.copy()

    skip_scale = {
        "checksum_int",
        "rtu_status",
        "power_supply",
        "otdr_avail",
        "fiber_status",
        "route_status",
        "test_result",
        "severity",
        "alarm_status",
        "supplier",
        "fiber_type",
        "build_condition",
        "alarm_type",
        "test_mode",
        "num_averages",
        "num_data_points",
        "pulse_width_ns",
        "wavelength_nm",
        "user_offset_m",
    }

    num_cols = [
        col
        for col in X_train.columns
        if col not in skip_scale and pd.api.types.is_numeric_dtype(X_train[col])
    ]
    print(f"  Colonnes normalisees ({len(num_cols)}) : {num_cols}")

    scaler = StandardScaler()
    X_train.loc[:, num_cols] = scaler.fit_transform(X_train[num_cols])
    X_val.loc[:, num_cols] = scaler.transform(X_val[num_cols])
    X_test.loc[:, num_cols] = scaler.transform(X_test[num_cols])

    joblib.dump(scaler, OUTPUT_DIR / "scaler.pkl")
    print(f"\n  OK Scaler sauvegarde -> {OUTPUT_DIR / 'scaler.pkl'}")
    print("  OK Fit sur train uniquement (pas de data leakage)")

    return X_train, X_val, X_test, scaler


def compute_weights(y_train: pd.Series) -> dict:
    print("\n" + "=" * 60)
    print("  ETAPE 7 - Gestion du desequilibre (class_weight)")
    print("=" * 60)

    classes = np.unique(y_train)
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    class_weight_dict = {int(cls): float(weight) for cls, weight in zip(classes, weights)}

    print("\n  Class weights calcules :")
    for cls, weight in class_weight_dict.items():
        count = int((y_train == cls).sum())
        print(
            f"    Label {cls} ({LABEL_NAMES.get(cls, str(cls)):<15}) : "
            f"weight = {weight:.4f} ({count:,} samples)"
        )

    joblib.dump(class_weight_dict, OUTPUT_DIR / "class_weights.pkl")
    print(f"\n  OK Sauvegarde -> {OUTPUT_DIR / 'class_weights.pkl'}")

    return class_weight_dict


def save_datasets(
    X_train: pd.DataFrame,
    X_val: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_val: pd.Series,
    y_test: pd.Series,
) -> None:
    print("\n" + "=" * 60)
    print("  ETAPE 8 - Sauvegarde des datasets")
    print("=" * 60)

    datasets = {
        "X_train": X_train,
        "X_val": X_val,
        "X_test": X_test,
        "y_train": y_train,
        "y_val": y_val,
        "y_test": y_test,
    }

    for name, data in datasets.items():
        csv_path = OUTPUT_DIR / f"{name}.csv"
        npy_path = OUTPUT_DIR / f"{name}.npy"

        if isinstance(data, pd.Series):
            data.to_csv(csv_path, index=False, header=True)
            np.save(npy_path, data.to_numpy())
            shape = (len(data),)
        else:
            data.to_csv(csv_path, index=False)
            np.save(npy_path, data.to_numpy())
            shape = data.shape

        print(f"  OK {name:<10} -> {csv_path} (shape: {shape})")

    feature_names = list(X_train.columns)
    joblib.dump(feature_names, OUTPUT_DIR / "feature_names.pkl")
    print(f"\n  OK feature_names.pkl sauvegarde ({len(feature_names)} features)")


def generate_report(X_train: pd.DataFrame, y_train: pd.Series, y_val: pd.Series, y_test: pd.Series) -> None:
    print("\n" + "=" * 60)
    print("  ETAPE 9 - Rapport de pretraitement")
    print("=" * 60)

    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    fig.suptitle("NQMS - Rapport pretraitement OTDR", fontsize=14, fontweight="bold")

    ax = axes[0]
    counts = y_train.value_counts().sort_index()
    colors = ["#2ecc71", "#e74c3c", "#f39c12", "#c0392b", "#3498db", "#8e44ad"]
    bars = ax.bar(
        [LABEL_NAMES.get(int(i), str(i)).replace("_", " ") for i in counts.index],
        counts.values,
        color=colors[: len(counts)],
        edgecolor="white",
        linewidth=0.5,
    )
    ax.set_title("Distribution labels (train)", fontweight="bold")
    ax.set_ylabel("Nombre d'echantillons")
    ax.tick_params(axis="x", rotation=30)
    for bar, val in zip(bars, counts.values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(1, counts.max() * 0.01),
            f"{val:,}",
            ha="center",
            va="bottom",
            fontsize=9,
        )
    ax.spines[["top", "right"]].set_visible(False)

    ax = axes[1]
    num_features = [
        "attenuation_db",
        "total_loss_db",
        "orl_db",
        "splice_loss_max",
        "refl_abs",
        "end_loss_db",
        "att_per_km",
        "slope_deviation",
        "dynamic_range_db",
    ]
    avail = [feature for feature in num_features if feature in X_train.columns]
    if avail:
        corr = X_train[avail].corr()
        sns.heatmap(
            corr,
            ax=ax,
            cmap="RdBu_r",
            center=0,
            vmin=-1,
            vmax=1,
            annot=True,
            fmt=".1f",
            annot_kws={"size": 7},
            linewidths=0.3,
            xticklabels=[col.replace("_", " ") for col in avail],
            yticklabels=[col.replace("_", " ") for col in avail],
        )
        ax.set_title("Correlation features cles", fontweight="bold")
        ax.tick_params(axis="x", rotation=45, labelsize=7)
        ax.tick_params(axis="y", rotation=0, labelsize=7)
    else:
        ax.text(0.5, 0.5, "Aucune feature disponible", ha="center", va="center")
        ax.set_title("Correlation features cles", fontweight="bold")
        ax.axis("off")

    ax = axes[2]
    splits = {
        "Train\n(70%)": len(y_train),
        "Validation\n(15%)": len(y_val),
        "Test\n(15%)": len(y_test),
    }
    wedge_colors = ["#3498db", "#f39c12", "#2ecc71"]
    _, _, autotexts = ax.pie(
        splits.values(),
        labels=splits.keys(),
        colors=wedge_colors,
        autopct="%1.1f%%",
        startangle=90,
        wedgeprops={"edgecolor": "white", "linewidth": 2},
    )
    for text in autotexts:
        text.set_fontsize(10)
        text.set_fontweight("bold")
    ax.set_title("Repartition des donnees", fontweight="bold")

    plt.tight_layout()
    report_path = OUTPUT_DIR / "preprocessing_report.png"
    plt.savefig(report_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  OK Rapport visuel sauvegarde -> {report_path}")


def run_pipeline() -> dict:
    print("\n" + "=" * 60)
    print("  NQMS - Pipeline de pretraitement OTDR")
    print("=" * 60)

    df = load_data(DATA_PATH)
    df = clean_data(df)
    df = feature_engineering(df)
    df, encoders = encode_categoricals(df)

    X_train, X_val, X_test, y_train, y_val, y_test = split_data(df)
    X_train, X_val, X_test, scaler = scale_features(X_train, X_val, X_test)
    class_weights = compute_weights(y_train)

    save_datasets(X_train, X_val, X_test, y_train, y_val, y_test)
    generate_report(X_train, y_train, y_val, y_test)

    print("\n" + "=" * 60)
    print("  RESUME FINAL")
    print("=" * 60)
    print(f"  Dataset source   : {DATA_PATH.name}")
    print(f"  Total lignes     : {len(df):,}")
    print(f"  Features finales : {X_train.shape[1]}")
    print(f"  Train            : {len(X_train):,} lignes")
    print(f"  Validation       : {len(X_val):,} lignes")
    print(f"  Test             : {len(X_test):,} lignes")
    print(f"  Artefacts        : {OUTPUT_DIR}")
    print("\n  Pretraitement termine - pret pour l'etape d'entrainement.\n")

    return {
        "X_train": X_train,
        "X_val": X_val,
        "X_test": X_test,
        "y_train": y_train,
        "y_val": y_val,
        "y_test": y_test,
        "scaler": scaler,
        "encoders": encoders,
        "class_weights": class_weights,
        "feature_names": list(X_train.columns),
    }


def load_preprocessed(output_dir: str | Path = OUTPUT_DIR) -> dict:
    output_dir = Path(output_dir)

    return {
        "X_train": pd.read_csv(output_dir / "X_train.csv"),
        "X_val": pd.read_csv(output_dir / "X_val.csv"),
        "X_test": pd.read_csv(output_dir / "X_test.csv"),
        "y_train": pd.read_csv(output_dir / "y_train.csv").squeeze("columns"),
        "y_val": pd.read_csv(output_dir / "y_val.csv").squeeze("columns"),
        "y_test": pd.read_csv(output_dir / "y_test.csv").squeeze("columns"),
        "scaler": joblib.load(output_dir / "scaler.pkl"),
        "encoders": joblib.load(output_dir / "encoders.pkl"),
        "class_weights": joblib.load(output_dir / "class_weights.pkl"),
        "feature_names": joblib.load(output_dir / "feature_names.pkl"),
    }


if __name__ == "__main__":
    results = run_pipeline()

import json
import math
import re
import unicodedata
from pathlib import Path

import pandas as pd


REPO = Path(__file__).resolve().parents[1]
WORKSPACE = REPO.parent
SOURCE = WORKSPACE / "pkvedacoes"
WORKBOOK = SOURCE / "IVENTARIO (1).xlsx"
PHOTOS = SOURCE / "Fotos"
OUTPUT = REPO / "catalogs" / "pk-vedacoes"


def clean(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if hasattr(value, "item"):
        value = value.item()
    return value


def normalized(value):
    value = unicodedata.normalize("NFKD", str(value))
    return "".join(char for char in value if not unicodedata.combining(char)).lower()


def find_column(columns, *terms):
    for column in columns:
        name = normalized(column)
        if all(term in name for term in terms):
            return column
    return None


def source_ref(path):
    return "workspace:" + path.relative_to(WORKSPACE).as_posix()


product_sheets = []
for sheet in pd.ExcelFile(WORKBOOK).sheet_names:
    if sheet in {"0000", "0150", "0200", "H001", "H005", "H010", "H990"}:
        continue
    frame = pd.read_excel(WORKBOOK, sheet_name=sheet)
    code_column = find_column(frame.columns, "codigo")
    description_column = find_column(frame.columns, "descr")
    if code_column is None or description_column is None:
        continue
    ncm_column = find_column(frame.columns, "ncm")
    unit_column = find_column(frame.columns, "un", "medida")
    quantity_column = find_column(frame.columns, "quantidade")
    price_column = find_column(frame.columns, "preco", "unitario")
    for row_number, row in frame.iterrows():
        code = clean(row[code_column])
        description = clean(row[description_column])
        if not code or not description:
            continue
        product_sheets.append(
            {
                "sourceSheet": str(sheet),
                "sourceRow": int(row_number) + 2,
                "productCode": str(code).strip(),
                "description": str(description).strip(),
                "ncm": clean(row[ncm_column]) if ncm_column else None,
                "unit": clean(row[unit_column]) if unit_column else None,
                "stockQuantity": clean(row[quantity_column]) if quantity_column else None,
                "unitPriceSource": clean(row[price_column]) if price_column else None,
                "imageMatchStatus": "unmatched",
                "dimensionStatus": "not_structured_in_workbook",
                "dimensionsMm": None,
                "modelStatus": "not_modeled",
                "notes": "Confirmar dimensões técnicas e vincular foto ao mesmo código antes de gerar spec 3D.",
            }
        )

photos = []
for photo in sorted(PHOTOS.iterdir()):
    if not photo.is_file():
        continue
    photos.append(
        {
            "sourceFile": photo.name,
            "sourceRef": source_ref(photo),
            "extension": photo.suffix.lower(),
            "bytes": photo.stat().st_size,
            "imageMatchStatus": "unmatched",
        }
    )

catalog_text = (SOURCE / "pk-catalogo-full.txt").read_text(encoding="utf-8")
published_catalog_products = len(re.findall(r"/produtos/[^)\s]+", catalog_text))
specs_dir = OUTPUT / "specs"
models_dir = OUTPUT / "models"
generated_specs = len(list(specs_dir.glob("*.json"))) if specs_dir.exists() else 0
exported_models = len([path for path in models_dir.iterdir() if path.is_dir()]) if models_dir.exists() else 0

inventory = {
    "schemaVersion": 1,
    "companyId": "pk-vedacoes",
    "companyName": "PK Vedações",
    "status": "ready_for_identity_and_dimension_review",
    "source": {
        "workbook": source_ref(WORKBOOK),
        "photoDirectory": source_ref(PHOTOS),
        "catalogText": source_ref(SOURCE / "pk-catalogo-full.txt"),
        "rule": "The workbook is an internal inventory source. It does not by itself approve 3D geometry or link photos to products.",
    },
    "summary": {
        "productRows": len(product_sheets),
        "photoAssets": len(photos),
        "matchedPhotos": 0,
        "structuredDimensions": 0,
        "publishedCatalogProducts": published_catalog_products,
        "specsGenerated": generated_specs,
        "modelsExported": exported_models,
        "reviewPending": generated_specs,
        "modeled": exported_models,
    },
    "products": product_sheets,
    "photos": photos,
}

OUTPUT.mkdir(parents=True, exist_ok=True)
(OUTPUT / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

contract = json.loads((OUTPUT / "dimensional-contract.json").read_text(encoding="utf-8"))
contract["status"] = "draft_with_source_found"
contract["sourceEvidence"] = [
    source_ref(WORKBOOK),
    source_ref(PHOTOS),
    source_ref(SOURCE / "pk-catalogo-full.txt"),
]
contract["reviewGates"] = [
    "Match every selected product to one official code and one primary image.",
    "Confirm internal diameter, external diameter and height or thickness in millimetres.",
    "Keep unmatched photos outside the 3D catalog until identity is proven.",
]
(OUTPUT / "dimensional-contract.json").write_text(json.dumps(contract, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(
    json.dumps(
        {
            "productRows": len(product_sheets),
            "photoAssets": len(photos),
            "matchedPhotos": 0,
            "structuredDimensions": 0,
            "publishedCatalogProducts": published_catalog_products,
            "specsGenerated": generated_specs,
            "modelsExported": exported_models,
            "reviewPending": generated_specs,
        },
        ensure_ascii=False,
    )
)

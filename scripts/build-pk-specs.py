import json
import re
import unicodedata
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
SOURCE = REPO.parent / "pkvedacoes" / "pk-catalogo-full.txt"
OUT = REPO / "catalogs" / "pk-vedacoes" / "specs"
PRODUCT = re.compile(
    r"^- \[(?P<name>[^]]+)\]\(https://pkvedacoes\.com\.br/produtos/(?P<slug>[^)]+)\):"
)
DIMENSIONS = re.compile(
    r"(?P<di>[0-9]+(?:[,.][0-9]+)?)\s*[×x]\s*"
    r"(?P<de>[0-9]+(?:[,.][0-9]+)?)\s*[×x]\s*"
    r"(?P<height>[0-9]+(?:[,.][0-9]+)?)\s*mm",
    re.IGNORECASE,
)


def number(value):
    return float(value.replace(",", "."))


def clean_id(slug):
    value = unicodedata.normalize("NFKD", slug)
    value = "".join(char for char in value if not unicodedata.combining(char))
    return "PK-" + re.sub(r"[^A-Za-z0-9]+", "-", value).strip("-").upper()


def kind(name):
    lowered = name.casefold()
    if "raspador" in lowered:
        return "wiper"
    if "gaxeta" in lowered:
        return "gasket"
    if "anel guia" in lowered:
        return "guide"
    if "anel" in lowered:
        return "oring"
    return "seal"


OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.json"):
    old.unlink()

generated = []
skipped = []
for line in SOURCE.read_text(encoding="utf-8", errors="replace").splitlines():
    product = PRODUCT.match(line.strip())
    if not product:
        continue
    dimensions = DIMENSIONS.search(product.group("name"))
    if not dimensions:
        skipped.append({"name": product.group("name"), "slug": product.group("slug")})
        continue
    di = number(dimensions.group("di"))
    de = number(dimensions.group("de"))
    height = number(dimensions.group("height"))
    spec_id = clean_id(product.group("slug"))
    spec = {
        "id": spec_id,
        "name": product.group("name"),
        "family": "seal",
        "dimensionsMm": {"length": de, "width": de, "height": height},
        "params": {"innerDiameter": di / 1000, "kind": kind(product.group("name"))},
        "materials": {"accent": "#e1c400" if "raspador" in product.group("name").casefold() else "#1f8fbd"},
        "review": {
            "status": "needs_review",
            "notes": "Geometria anular paramétrica derivada das medidas publicadas. Conferir perfil, material, acabamento e foto antes da publicação.",
        },
        "meta": {
            "empresa": "PK Vedações",
            "kind": kind(product.group("name")),
            "diMm": di,
            "deMm": de,
            "heightMm": height,
            "sourceUrl": f"https://pkvedacoes.com.br/produtos/{product.group('slug')}",
            "sourceSlug": product.group("slug"),
            "sourceStatus": "published_catalog_text",
        },
    }
    (OUT / f"{spec_id}.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    generated.append(spec)

report = {
    "source": f"workspace:{SOURCE.relative_to(REPO.parent).as_posix()}",
    "totalProductLines": len(generated) + len(skipped),
    "generated": len(generated),
    "skippedWithoutDimensions": skipped,
    "reviewStatus": "needs_review",
    "families": {"seal": len(generated)},
}
(OUT.parent / "specs-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"generated": len(generated), "skippedWithoutDimensions": len(skipped)}, ensure_ascii=False))

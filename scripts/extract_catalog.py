"""Extract product-friendly text and images from source PDFs/DOCX files.

The landing page uses data/catalog.json for curated public display. This helper
creates a sanitized manifest from source documents so new PDFs can be reviewed
and folded into the catalog without exposing rates or payment terms.
"""

from __future__ import annotations

import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image, ImageOps
from pypdf import PdfReader

try:
    from docx import Document
except ImportError:  # DOCX extraction is optional.
    Document = None


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT.parent
OUTPUT_ROOT = PROJECT_ROOT / "assets" / "extracted"
MANIFEST_PATH = PROJECT_ROOT / "data" / "extracted-manifest.json"

PRICE_PATTERNS = (
    re.compile(r"(@|₹|rs\.?|/-|\bprice\b|\brates?\b|\blanding\b|\bcharges?\b|\bpayment\b)", re.I),
    re.compile(r"\b\d+(?:,\d{2,3})*(?:\.\d+)?\s*(?:per|each|pc|ft|feet)\b", re.I),
)

CATEGORY_KEYWORDS = {
    "glass": ("glass", "railing", "spigot", "toughened", "balcony", "partition"),
    "windows": ("upvc", "window", "profile", "casement", "sliding", "aluminium"),
    "doors": ("door", "virgo", "abco", "designer", "digital"),
    "pvc": ("pvc", "membrane", "lamination", "cabinet", "furniture"),
    "hardware": ("fitting", "hardware", "gasket", "bracket", "handle", "jointer", "bend"),
}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:70] or "document"


def contains_price_data(text: str) -> bool:
    return any(pattern.search(text) for pattern in PRICE_PATTERNS)


def sanitized_lines(text: str) -> list[str]:
    lines = []
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if len(line) < 4 or contains_price_data(line):
            continue
        if line not in lines:
            lines.append(line)
    return lines[:80]


def categorize(text: str) -> list[str]:
    lowered = text.lower()
    categories = []
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            categories.append(category)
    return categories or ["general"]


def save_image(data: bytes, target: Path) -> bool:
    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except Exception:
        return False

    width, height = image.size
    if width < 240 or height < 240:
        return False

    image.thumbnail((1300, 980), Image.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "WEBP", quality=82, method=6)
    return True


def extract_pdf(path: Path) -> dict:
    reader = PdfReader(str(path))
    slug = slugify(path.stem)
    doc_out = OUTPUT_ROOT / slug
    seen: set[str] = set()
    images = []
    text_lines = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        text_lines.extend(line for line in sanitized_lines(page_text) if line not in text_lines)

        try:
            page_images = list(page.images)
        except Exception:
            page_images = []

        for image_index, image_file in enumerate(page_images, start=1):
            digest = hashlib.sha1(image_file.data).hexdigest()[:12]
            if digest in seen:
                continue
            seen.add(digest)
            target = doc_out / f"page-{page_number:02d}-image-{image_index:02d}-{digest}.webp"
            if save_image(image_file.data, target):
                images.append(str(target.relative_to(PROJECT_ROOT)).replace("\\", "/"))

    joined_text = " ".join(text_lines) + " " + path.name
    return {
        "source": path.name,
        "type": "pdf",
        "pages": len(reader.pages),
        "categories": categorize(joined_text),
        "sanitizedText": text_lines,
        "images": images,
    }


def extract_docx(path: Path) -> dict | None:
    if Document is None:
        return None
    document = Document(str(path))
    text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    lines = sanitized_lines(text)
    return {
        "source": path.name,
        "type": "docx",
        "categories": categorize(" ".join(lines) + " " + path.name),
        "sanitizedText": lines,
        "images": [],
    }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = []

    for path in sorted(SOURCE_ROOT.glob("*.pdf")):
        manifest.append(extract_pdf(path))

    for path in sorted(SOURCE_ROOT.glob("*.docx")):
        extracted = extract_docx(path)
        if extracted:
            manifest.append(extracted)

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {MANIFEST_PATH.relative_to(PROJECT_ROOT)} with {len(manifest)} source documents.")


if __name__ == "__main__":
    main()

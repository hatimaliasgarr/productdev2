# AWC Enterprizes Landing Page

Premium static website for AWC Enterprizes with a beige and gold luxury theme, responsive layout, smooth interactions, PDF-derived product imagery, and a dynamic product catalog.

## Run Locally

From `D:\shreyash\awc-enterprizes`:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765`.

## Update Content

- Product catalog: edit `data/catalog.json`.
- Contact placeholders: edit the Contact section in `index.html`.
- Logo and product images: replace files in `assets/` and `assets/products/`.
- Google Maps: replace the empty map block in `index.html` with your Google Maps embed iframe.

## Refresh Extracted Document Assets

The helper script reads PDFs/DOCX files from the parent folder, extracts usable product images, and writes a sanitized manifest without rate lines:

```powershell
& 'C:\Users\hatim\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\extract_catalog.py
```

Review `data/extracted-manifest.json`, then fold approved products/images into `data/catalog.json`.

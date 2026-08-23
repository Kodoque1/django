#!/usr/bin/env python3
"""Génère les cheatsheets à partir des champs `explain` des frames."""
import re
import json
from pathlib import Path

DEPOT = Path("/home/kodoque/Documents/django")
OUT_DIR = DEPOT / "cheatsheets"
OUT_DIR.mkdir(exist_ok=True)

# Chercher tous les fichiers de widgets
widget_files = list((DEPOT / "cours").rglob("js/widgets/*-frames.js"))

all_explains = []

for wf in widget_files:
    content = wf.read_text(encoding="utf-8")
    # Trouver les champs explain dans les frames
    # Pattern: explain: "..." ou explain: '...'
    for m in re.finditer(r'explain\s*:\s*["\']((?:(?!(?:["\']\s*[,}])).)*)["\']', content, re.DOTALL):
        explain = m.group(1)
        # Nettoyer : enlever les \n internes, les balises HTML
        clean = re.sub(r'<[^>]+>', '', explain)
        clean = clean.replace('\n', ' ').strip()
        if clean and len(clean) > 10:
            # Trouver le nom du widget
            widget_name = wf.stem.replace('-frames', '').replace('-', ' ').title()
            all_explains.append({
                "widget": widget_name,
                "file": str(wf.relative_to(DEPOT)),
                "explain": clean
            })

# Grouper par widget
from collections import defaultdict
by_widget = defaultdict(list)
for e in all_explains:
    by_widget[e["widget"]].append(e["explain"])

# Générer le Markdown
md = """# Cheatsheets — Cours Django IPSSI

> **Syntaxe et vocabulaire uniquement** — pas de discrimination (celle des jeux).
> À distribuer **pendant** la séance.

"""

for widget, explains in sorted(by_widget.items()):
    md += f"## {widget}\n\n"
    for i, exp in enumerate(explains, 1):
        # Extraire les points clés : signatures, noms de méthodes, codes, patterns
        md += f"### Frame {i}\n\n"
        md += f"{exp}\n\n"

# Écrire
(OUT_DIR / "cheatsheets.md").write_text(md, encoding="utf-8")
print(f"Cheatsheets: {OUT_DIR / 'cheatsheets.md'} ({len(all_explains)} explains)")

# Aussi version HTML simple
html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Cheatsheets Django IPSSI</title>
<style>
  body {{ font-family: system-ui; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }}
  h1 {{ border-bottom: 2px solid #e85d04; padding-bottom: .5rem; }}
  h2 {{ color: #e85d04; border-left: 4px solid #e85d04; padding-left: .8rem; margin-top: 2.5rem; }}
  h3 {{ margin-top: 1.5rem; color: #ccc; }}
  code {{ background: #222; padding: .1rem .4rem; border-radius: 3px; }}
  pre {{ background: #111; padding: 1rem; overflow: auto; border-radius: 4px; }}
  .frame {{ margin: 1.5rem 0; padding: 1rem; border: 1px solid #333; border-radius: 4px; }}
</style></head>
<body>
  <h1>Cheatsheets — Cours Django IPSSI</h1>
  <p><em>Syntaxe et vocabulaire uniquement — pas de discrimination (celle des jeux).</em></p>
"""

for widget, explains in sorted(by_widget.items()):
    html += f"  <h2>{widget}</h2>\n"
    for i, exp in enumerate(explains, 1):
        html += f'  <div class="frame"><h3>Frame {i}</h3><p>{exp}</p></div>\n'

html += "</body></html>"
(OUT_DIR / "cheatsheets.html").write_text(html, encoding="utf-8")
print(f"HTML: {OUT_DIR / 'cheatsheets.html'}")

# Vérifier si le contenu est suffisant (pas trop de bruit)
if len(all_explains) < 5:
    print("⚠ Peu d'explains trouvés — vérifier les fichiers widget")

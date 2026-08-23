#!/usr/bin/env python3
"""
gen-version-etudiante.py — version étudiante : les jeux seuls, sans méta.

Pour chaque module du cours :
  - garde uniquement les <section class="widget-slide"> ;
  - retire les <aside class="notes"> (script orateur — §0 bis) ;
  - conserve l'identité visuelle IPSSI (theme-ipssi.css, favicon, bandeau) ;
  - ne charge que les scripts du module concerné + le socle partagé ;
  - retire les slides informatives, intercalaires, objectifs, tout ce qui est méta.

Usage : python3 outils/gen-version-etudiante.py
"""
import os
import re
import shutil
from pathlib import Path

DEPOT = Path(__file__).resolve().parent.parent
COURS = DEPOT / "cours"
OUT = DEPOT / "version-etudiante"

MODULES = [
    "J1-01-architecture-restful",
    "J1-02-architecture-django",
    "J2-01-drf",
    "J4-01-autorisations",
    "J4-02-authentification",
]

# Le socle chargé par tout deck (relatif à cours/)
SOCLE_CSS = [
    "vendor/reveal/dist/reveal.css",
    "vendor/reveal/dist/theme/white.css",
    "vendor/reveal/plugin/highlight/monokai.css",
    "css/theme-ipssi.css",
    "css/widgets.css",
    "css/pi-frames.css",
    "css/jeux.css",
    "css/simulations.css",
]
# Ordre contractuel (CLAUDE.md §9) : theme.js avant init.js ; le script d'un jeu
# avant reveal/init — les widgets doivent être enregistrés quand init.js monte.
SOCLE_JS_AVANT = []                           # (pi-frames passe dans le head, avant les widgets)
SOCLE_JS_APRES = [                            # après reveal
    "vendor/reveal/dist/reveal.js",
    "vendor/reveal/plugin/highlight/highlight.js",
    "vendor/reveal/plugin/notes/notes.js",
    "vendor/mermaid/mermaid.min.js",
    "js/init.js",
]


def widget_slides(html: str):
    """Extrait les sections widget-slide (sans les notes orateur)."""
    slides = []
    for m in re.finditer(r'<section class="widget-slide"[^>]*>.*?</section>', html, re.S):
        bloc = m.group(0)
        # retirer les notes orateur (méta — le contrat §0 bis)
        bloc = re.sub(r'<aside class="notes">.*?</aside>', '', bloc, flags=re.S)
        # « activité », pas « jeu » : la manette annonce un jeu, le crayon une activité
        bloc = bloc.replace("🎮", "✎")
        # retirer les attributs de minutage éventuels
        slides.append(bloc)
    return slides


def widgets_utilises(slides):
    """Les data-widget présents → noms de fichiers scripts du module."""
    return re.findall(r'data-widget="([A-Za-z]+)"', "".join(slides))


def generer(module: str):
    src = (COURS / module / "index.html").read_text(encoding="utf-8")

    # titre du deck
    t = re.search(r"<title>([^<]+)</title>", src)
    titre = t.group(1) if t else module

    slides = widget_slides(src)
    if not slides:
        print(f"  ⚠ {module} : aucune widget-slide, ignoré")
        return None

    scripts_module = sorted(
        (COURS / module / "js" / "widgets").glob("*.js"),
        key=lambda p: p.name,
    ) if (COURS / module / "js" / "widgets").exists() else []

    rel = lambda p: f"assets/{p}"
    css = "\n".join(f'  <link rel="stylesheet" href="{rel(c)}">' for c in SOCLE_CSS)
    js_module = "\n".join(
        f'  <script src="assets/widgets/{module}/{p.name}"></script>'
        for p in scripts_module
    )
    js_avant = "\n".join(f'  <script src="{rel(j)}"></script>' for j in SOCLE_JS_AVANT)
    js_apres = "\n".join(f'  <script src="{rel(j)}"></script>' for j in SOCLE_JS_APRES)

    corps = "\n".join(slides)

    page = f"""<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
  <meta charset="utf-8">
  <title>{titre}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%90%8D%3C/text%3E%3C/svg%3E" />
{css}
  <script src="{rel('js/theme.js')}"></script>
  <script src="{rel('js/pi-frames.js')}"></script>
</head>
<body>
  <div class="reveal">
    <div class="slides">
{corps}
    </div>
  </div>
{js_module}
{js_avant}
{js_apres}
  <script>
    Reveal.initialize({{ hash: true, controls: true, progress: true, slideNumber: true, center: false, transition: "slide" }});
  </script>
</body>
</html>
"""
    dest = OUT / f"{module}.html"
    dest.write_text(page, encoding="utf-8")
    print(f"  ✓ {module}: {len(slides)} activité(s), {len(scripts_module)} script(s) → {dest.name}")
    return dest


TITRES = {
    "J1-01-architecture-restful": ("Jour 1", "Architecture RESTful"),
    "J1-02-architecture-django": ("Jour 1–2", "Architecture Django"),
    "J2-01-drf": ("Jour 2", "Django REST Framework"),
    "J4-01-autorisations": ("Jour 4", "Autorisations"),
    "J4-02-authentification": ("Jour 4", "Authentification"),
}


def index():
    liens = "\n".join(
        f'    <li><a href="{m}.html"><span class="jour">{j}</span>'
        f'<span class="titre-lien">{t}</span><span class="sujet">ouvrir</span></a></li>'
        for m, (j, t) in TITRES.items()
    )
    page = f"""<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
  <meta charset="utf-8">
  <title>Cours Django IPSSI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%90%8D%3C/text%3E%3C/svg%3E" />
  <style>
    :root {{ --fond: #ffffff; --carte: #f6f4f1; --bord: #ddd8d2; --accent: #e85d04; --texte: #26221e; --doux: #7a736a; }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: system-ui, sans-serif; background: var(--fond); color: var(--texte); line-height: 1.6; }}
    main {{ max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem; }}
    h1 {{ font-size: 1.6rem; border-bottom: 2px solid var(--accent); padding-bottom: .6rem; }}
    h1 span {{ color: var(--accent); }}
    p.sous {{ color: var(--doux); margin-top: -.4rem; }}
    ul {{ list-style: none; padding: 0; margin-top: 2rem; display: grid; gap: .8rem; }}
    li a {{ display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
           background: var(--carte); border: 1px solid var(--bord); border-radius: 8px;
           padding: 1rem 1.2rem; color: var(--texte); text-decoration: none; transition: border-color .15s; }}
    li a:hover {{ border-color: var(--accent); }}
    .jour {{ color: var(--accent); font-weight: 600; min-width: 5.5rem; }}
    .titre-lien {{ flex: 1; }}
    .sujet {{ color: var(--doux); font-size: .92em; }}
  </style>
</head>
<body>
  <main>
    <h1>Cours Django <span>IPSSI</span></h1>
    <p class="sous">Les activités de chaque journée.</p>
    <ul>
{liens}
    </ul>
  </main>
</body>
</html>
"""
    (OUT / "index.html").write_text(page, encoding="utf-8")
    print(f"  ✓ index.html")


def copier_assets():
    """Copie le socle (vendor, css, js, widgets) dans assets/ — la version étudiante
    est autonome : elle fonctionne même servie depuis son propre dossier, ou dézippée
    seule hors du dépôt."""
    import shutil
    assets = OUT / "assets"
    if assets.exists():
        shutil.rmtree(assets)
    assets.mkdir()
    for d in ("vendor", "css", "js"):
        shutil.copytree(COURS / d, assets / d)
    for m in MODULES:
        w = COURS / m / "js" / "widgets"
        if w.is_dir():
            shutil.copytree(w, assets / "widgets" / m)
    n = sum(len(f) for _, _, f in os.walk(assets))
    print(f"  ✓ assets/ copié ({n} fichiers) — version autonome")


def main():
    OUT.mkdir(exist_ok=True)
    print("Génération version étudiante…")
    copier_assets()
    for m in MODULES:
        generer(m)
    index()


if __name__ == "__main__":
    main()

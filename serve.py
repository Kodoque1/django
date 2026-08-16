#!/usr/bin/env python3
"""
Serveur HTTP de développement SANS CACHE.

`python3 -m http.server` n'envoie aucun en-tête de cache : le navigateur rejoue alors
d'anciens fichiers JS/HTML sur un rechargement normal (F5), et on croit tester une version
alors qu'on voit la précédente. Ce serveur ajoute `Cache-Control: no-store` à chaque réponse :
chaque rechargement récupère toujours la dernière version des fichiers.

Usage :
    python3 serve.py            # port 8000
    python3 serve.py 8080       # autre port

À lancer depuis la racine du dépôt, puis ouvrir http://localhost:8000/cours/<module>/
(ex. cours/J2-03-notions-d-architecture/).
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Serveur (sans cache) sur http://localhost:{port}  —  Ctrl+C pour arrêter")
    try:
        HTTPServer(("", port), NoCacheHandler).serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt.")

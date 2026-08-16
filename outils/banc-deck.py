#!/usr/bin/env python3
"""
banc-deck.py — déroule chaque deck dans un vrai Chrome et vérifie ce que jsdom ne voit pas.

    python3 outils/banc-deck.py                 # tous les decks de cours/
    python3 outils/banc-deck.py J1-01-...       # un seul

jsdom ne calcule aucun style : il ne peut ni voir un débordement de slide, ni savoir si
Mermaid a rendu, ni détecter un widget qui se monte deux fois. Ce banc-ci le fait, en
pilotant Chrome par le protocole DevTools. Il ne remplace pas la passe manuelle — il en
automatise la partie mécanique, celle qu'on saute quand on est pressé.

Prérequis : `google-chrome` et `pip install websocket-client`. À défaut, le banc se saute.
"""

import base64
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURS = os.path.join(RACINE, "cours")


def port_libre():
    s = socket.socket()
    s.bind(("", 0))
    p = s.getsockname()[1]
    s.close()
    return p


class Chrome:
    def __init__(self):
        import websocket

        self.profil = tempfile.mkdtemp(prefix="banc-deck-")
        port = port_libre()
        self.log = open(os.path.join(self.profil, "chrome.log"), "w")
        self.proc = subprocess.Popen([
            "google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox",
            "--hide-scrollbars", "--window-size=1280,800", "--remote-allow-origins=*",
            f"--remote-debugging-port={port}", f"--user-data-dir={self.profil}", "about:blank",
        ], stdout=self.log, stderr=subprocess.STDOUT)
        import urllib.request

        for _ in range(120):
            try:
                cibles = json.load(urllib.request.urlopen(f"http://localhost:{port}/json"))
                pages = [t for t in cibles if t["type"] == "page"]
                if pages:
                    self.ws = websocket.create_connection(pages[0]["webSocketDebuggerUrl"], timeout=30)
                    break
            except Exception:
                time.sleep(0.25)
        else:
            raise RuntimeError("Chrome n'a pas démarré")
        self.n = 0
        self.journal = []
        for m in ("Runtime.enable", "Page.enable", "Log.enable"):
            self.envoie(m)

    def envoie(self, methode, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": methode, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.n:
                return msg.get("result", {})
            self._evenement(msg)

    def _evenement(self, msg):
        m = msg.get("method")
        if m == "Runtime.exceptionThrown":
            d = msg["params"]["exceptionDetails"]
            self.journal.append("EXCEPTION " + (d.get("exception", {}).get("description") or d.get("text") or ""))
        elif m == "Runtime.consoleAPICalled" and msg["params"]["type"] == "error":
            self.journal.append("CONSOLE " + " ".join(str(a.get("value", "")) for a in msg["params"]["args"]))
        elif m == "Log.entryAdded" and msg["params"]["entry"]["level"] == "error":
            self.journal.append("LOG " + msg["params"]["entry"]["text"])

    def pompe(self, secondes):
        fin = time.time() + secondes
        self.ws.settimeout(0.2)
        while time.time() < fin:
            try:
                self._evenement(json.loads(self.ws.recv()))
            except Exception:
                pass
        self.ws.settimeout(30)

    def ev(self, expr):
        r = self.envoie("Runtime.evaluate", expression=expr, returnByValue=True, userGesture=True)
        if "exceptionDetails" in r:
            return {"erreur": r["exceptionDetails"].get("exception", {}).get("description", "?")}
        return r.get("result", {}).get("value")

    def va(self, url, attente, secondes=25):
        self.journal.clear()
        self.envoie("Page.navigate", url=url)
        fin = time.time() + secondes
        while time.time() < fin:
            if self.ev(attente) is True:
                self.pompe(1.0)
                return True
            time.sleep(0.2)
        return False

    def capture(self, chemin):
        r = self.envoie("Page.captureScreenshot", format="png")
        with open(chemin, "wb") as f:
            f.write(base64.b64decode(r["data"]))

    def ferme(self):
        try:
            self.ws.close()
        except Exception:
            pass
        self.proc.terminate()
        self.proc.wait(timeout=10)
        self.log.close()
        shutil.rmtree(self.profil, ignore_errors=True)


# --- ce qu'on vérifie, dans la page --------------------------------------------
# Les jeux débordent facilement : la barre de validation sort sous la slide dès que le
# feedback s'affiche. C'est arrivé (+201 px) et aucun autre banc ne peut le voir.
DEBORDEMENT = r"""
(function () {
  var s = document.querySelector('section.present');
  if (!s) return null;
  var a = s.querySelector('.pi-actions');
  if (!a) return null;
  var rs = s.getBoundingClientRect(), ra = a.getBoundingClientRect();
  return Math.round(ra.bottom - rs.bottom);
})()
"""


# Les quatre tests du contrat de design §2 bis, dans la mesure où une machine peut les
# passer. Le test 3 — « calculé, pas énuméré » — est le plus important et le seul qui
# distingue vraiment une simulation d'un menu : on change un réglage, et le relevé DOIT
# changer. Un widget dont les sorties sont pré-écrites échoue ici.
RELEVE = "Array.from(document.querySelectorAll('.present .sim-readout b')).map(e=>e.textContent).join('|')"

# L'objet en mouvement n'est pas toujours un cercle : ce peut être un assemblage
# (`.sim-bloc` — un PDU et ses enveloppes emboîtées). On mesure donc sa boîte à l'écran
# plutôt que des attributs `cx`/`cy` : le banc ne doit pas imposer une forme aux
# simulations, seulement exiger que quelque chose bouge.
MOBILE = ".present .sim-packet, .present .sim-bloc"
POSITION = ("(function(p){ if(!p) return null; var r = p.getBoundingClientRect();"
            " return Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width); })"
            "(document.querySelector('%s'))" % MOBILE)


# Un libellé qui déborde de son cadre est invisible pour tout autre contrôle, et arrive
# facilement : en SVG, une règle CSS écrase l'attribut de présentation `text-anchor`, si
# bien qu'un `text-anchor="start"` posé sur l'élément est ignoré sans le moindre message.
DEBORDEMENT_TEXTE = r"""
(function () {
  var mauvais = [];
  document.querySelectorAll('.present .sim-node').forEach(function (g) {
    var rect = g.querySelector('rect');
    if (!rect) return;
    var r = rect.getBBox();
    g.querySelectorAll('text').forEach(function (t) {
      var b = t.getBBox();
      if (b.width === 0) return;
      if (b.x < r.x - 2 || b.x + b.width > r.x + r.width + 2) {
        mauvais.push((t.textContent || '').slice(0, 28));
      }
    });
  });

  // Et aucun texte ne doit sortir du viewBox : un titre de colonne n'appartient à aucun
  // cadre, il échappait donc au contrôle ci-dessus — et se faisait couper au bord.
  document.querySelectorAll('.present .sim-svg').forEach(function (svg) {
    var vb = svg.viewBox.baseVal;
    svg.querySelectorAll('text').forEach(function (t) {
      var b = t.getBBox();
      if (b.width === 0) return;
      if (b.x < vb.x - 2 || b.x + b.width > vb.x + vb.width + 2) {
        mauvais.push('hors cadre : ' + (t.textContent || '').slice(0, 24));
      }
    });
  });
  return mauvais;
})()
"""


# Une slide plus haute que le canevas de reveal est simplement COUPÉE : rien ne la réduit,
# aucune barre de défilement n'apparaît, et le bas — souvent la phrase qui conclut — n'existe
# pas pour la salle. Le contrôle de débordement des jeux ne le voyait pas : il compare des
# éléments à la slide, pas la slide à l'écran.
#
# Mesure indépendante de la transition : on prend l'extension du CONTENU relativement au haut
# de sa propre section, puis on divise par l'échelle de reveal pour revenir en unités de
# canevas. Une translation en cours d'animation s'annule dans la soustraction — ce qui n'est
# pas le cas d'une comparaison à `window`, qui donne des faux positifs en pleine transition.
HAUTEUR = r"""
(function () {
  var ss = Array.from(document.querySelectorAll('section.present'));
  var s = ss.filter(function (x) { return !x.querySelector('section.present'); })[0] || ss[0];
  if (!s) return null;
  var haut = s.getBoundingClientRect().top, bas = -1e9;
  Array.from(s.children).forEach(function (e) {
    var r = e.getBoundingClientRect();
    if (r.height > 0) bas = Math.max(bas, r.bottom);
  });
  if (bas === -1e9) return null;
  return {
    titre: ((s.querySelector('h1, h2') || {}).textContent || '(sans titre)').trim().slice(0, 44),
    contenu: Math.round((bas - haut) / (Reveal.getScale() || 1)),
    // ⚠ `dispo` est `config.height` NU. La marge n'est pas retirée du contenu : reveal
    // l'absorbe dans l'échelle qu'il calcule. Soustraire `2 * margin` fait apparaître un
    // écart CONSTANT de 86 px sur toute slide qui remplit sa hauteur — les widgets, qui
    // sont dimensionnés pour ça — et le banc accuse alors des slides parfaitement lisibles.
    dispo: Reveal.getConfig().height,
  };
})()
"""

# Quelques pixels de tolérance : les widgets sont dimensionnés pour remplir exactement la
# hauteur, et l'arrondi des sous-pixels les ferait osciller autour du seuil.
MARGE_HAUTEUR = 6


def fleche_droite(c):
    """Une vraie frappe clavier — pas un appel d'API : c'est ce que fait l'enseignant."""
    for t in ("keyDown", "keyUp"):
        c.envoie("Input.dispatchKeyEvent", type=t, key="ArrowRight", code="ArrowRight",
                 windowsVirtualKeyCode=39, nativeVirtualKeyCode=39)


def verifier_simulation(c, widget, v):
    q = f"« {widget} »"
    v(f"simulation {q} : scène SVG présente",
      c.ev("!!document.querySelector('.present .sim-widget .sim-svg')"))
    v(f"simulation {q} : un objet en mouvement",
      c.ev(f"!!document.querySelector('{MOBILE}')"))
    deborde = c.ev(DEBORDEMENT_TEXTE) or []
    v(f"simulation {q} : aucun libellé ne déborde de son cadre",
      not deborde, f"({deborde[:3]})")

    lance = "(function(b){ if(b) b.click(); return !!b; })" \
            "(document.querySelector('.present .sim-btn.primary'))"
    if not c.ev(lance):
        v(f"simulation {q} : bouton d'action", False, "(.sim-btn.primary absent)")
        return

    # Test 2 — axe du temps : la position doit CHANGER pendant l'animation.
    positions = []
    for _ in range(6):
        positions.append(c.ev(POSITION))
        c.pompe(0.18)
    v(f"simulation {q} : test 2 — quelque chose bouge dans le temps",
      len(set(p for p in positions if p)) > 1, f"({positions[:3]})")

    c.pompe(1.6)
    v(f"simulation {q} : le journal se remplit",
      (c.ev("document.querySelectorAll('.present .sim-log-line').length") or 0) > 0)
    releve1 = c.ev(RELEVE)
    v(f"simulation {q} : le relevé est renseigné", bool(releve1 and releve1.strip("|")))

    # Test 3 — calculé, pas énuméré. Formulation exacte : **il existe un réglage** dont le
    # changement modifie la sortie. On essaie donc plusieurs contrôles, car certains n'ont
    # légitimement aucun effet sur l'entrée courante — basculer APPEND_SLASH sur un chemin
    # qui correspond déjà ne change rien, et c'est le comportement juste.
    essais = [
        ("permutation", "document.querySelector('.present .sim-pile-item .sim-btn:not([disabled])')"),
        ("bascule", "document.querySelector('.present .sim-btn[aria-pressed]')"),
        ("préréglage", "document.querySelectorAll('.present .sim-controls .sim-btn')[1]"),
    ]
    tentes = []
    for nom, selecteur in essais:
        if not c.ev(f"(function(b){{ if(b) b.click(); return !!b; }})({selecteur})"):
            continue
        tentes.append(nom)
        c.ev(lance)
        c.pompe(2.2)
        if c.ev(RELEVE) != releve1:
            v(f"simulation {q} : test 3 — le résultat est calculé, pas énuméré ({nom})", True)
            return
    v(f"simulation {q} : test 3 — le résultat est calculé, pas énuméré", False,
      f"(aucun de {tentes or 'aucun contrôle'} ne change le relevé « {releve1} »)")


def verifier_deck(c, base, dossier, pbs):
    nom = os.path.basename(dossier)
    print(f"\n  {nom}")
    url = f"{base}/cours/{nom}/"

    def v(libelle, cond, detail=""):
        if cond:
            print(f"    ✓ {libelle}")
        else:
            pbs.append(f"{nom} · {libelle}")
            print(f"    ✗ {libelle} {detail}")

    if not c.va(url, "!!window.Reveal && Reveal.isReady()"):
        v("le deck se charge", False, "(Reveal n'est jamais prêt)")
        return
    v("console vierge au chargement", not c.journal, c.journal[:2])

    total = c.ev("Reveal.getTotalSlides()")
    mermaid = c.ev("document.querySelectorAll('.mermaid').length")
    jeux = c.ev("document.querySelectorAll('section[data-widget]').length")
    print(f"      {total} slides · {mermaid} diagrammes · {jeux} jeux")

    # Dérouler tout le deck AU CLAVIER, comme le fait l'enseignant en salle — et non avec
    # `Reveal.next()`, qui est linéaire par construction et masque le piège : en mode de
    # navigation « default », la flèche droite ne parcourt que l'axe horizontal, saute tout
    # le contenu vertical et se bloque sur la dernière partie. Le deck paraît cassé.
    c.ev("Reveal.slide(0,0)")
    atteintes = set()
    coupees = []
    for _ in range(total + 8):
        atteintes.add(c.ev("Reveal.getSlidePastCount()"))
        m = c.ev(HAUTEUR)
        if m and m["contenu"] > m["dispo"] + MARGE_HAUTEUR:
            trop = m["contenu"] - m["dispo"]
            if not any(x[0] == m["titre"] for x in coupees):
                coupees.append((m["titre"], trop))
        fleche_droite(c)
        c.pompe(0.12)
    c.pompe(1.5)
    v(f"toutes les slides sont atteignables à la flèche droite ({len(atteintes)}/{total})",
      len(atteintes) >= total, "— navigationMode: \"linear\" manque-t-il ?")
    v("aucune slide ne dépasse la hauteur du canevas",
      not coupees, "— " + " · ".join(f"« {t} » {n} px coupés" for t, n in coupees[:3]))
    v("parcours complet sans erreur console", not c.journal, c.journal[:3])

    rendus = c.ev("document.querySelectorAll('.mermaid[data-processed]').length")
    v(f"diagrammes Mermaid rendus ({rendus}/{mermaid})", rendus == mermaid)

    # Chaque widget : montage, rien qui déborde, et — selon son type — les contrôles propres
    # aux jeux (pi-frames) ou aux simulations (contrat de design §2 bis).
    indices = c.ev("""(function(){
      var r = [];
      document.querySelectorAll('section[data-widget]').forEach(function (s) {
        var i = Reveal.getIndices(s);
        r.push([s.getAttribute('data-widget'), i.h, i.v || 0]);
      });
      return r;})()""") or []
    for widget, h, v_ in indices:
        c.journal.clear()
        c.ev(f"Reveal.slide({h},{v_})")
        c.pompe(1.2)

        est_jeu = c.ev("!!document.querySelector('.present .pi-root')")
        est_sim = c.ev("!!document.querySelector('.present .sim-widget')")
        deb = c.ev(DEBORDEMENT)
        v(f"« {widget} » tient dans la slide", deb is None or deb <= 1, f"(+{deb} px)")

        if est_jeu:
            monte = c.ev("!!document.querySelector('.present .pi-root .pi-opt, .present .pi-root .pi-token,"
                         " .present .pi-root .pi-order-item, .present .pi-root .pi-free')")
            hud = c.ev("document.querySelectorAll('.present .pi-root .pi-hud').length")
            v(f"jeu « {widget} » se monte", monte)
            v(f"jeu « {widget} » : un seul bandeau", hud == 1, f"({hud})")
            # `.pi-answer` défile quand le contenu déborde : rien n'est perdu, mais au
            # vidéoprojecteur personne ne va faire défiler — la dernière option devient
            # invisible. Un énoncé trop long se paie ici.
            trop = c.ev("(function(e){ return e ? e.scrollHeight - e.clientHeight : 0; })"
                        "(document.querySelector('.present .pi-root .pi-answer'))") or 0
            v(f"jeu « {widget} » : les réponses tiennent sans défiler", trop <= 2, f"(+{trop} px)")
        elif est_sim:
            verifier_simulation(c, widget, v)
        else:
            v(f"« {widget} » se monte", False, "(ni .pi-root ni .sim-widget)")

        v(f"« {widget} » : console vierge", not c.journal, c.journal[:2])

    # Aller-retour : le widget doit se démonter puis se remonter proprement.
    if indices:
        w, h, v_ = indices[0]
        c.journal.clear()
        c.ev("Reveal.slide(0,0)")
        c.pompe(0.6)
        c.ev(f"Reveal.slide({h},{v_})")
        c.pompe(1.2)
        racines = c.ev("document.querySelectorAll('.pi-root .pi-hud, .sim-widget .sim-stage').length")
        v("remontage propre après aller-retour", racines == 1, f"({racines} racines)")

    # Thème : la bascule doit re-rendre Mermaid sans rien casser.
    #
    # Attention au piège : `invalidateAllMermaid()` invalide TOUS les diagrammes et ne
    # re-rend que celui de la slide visible — c'est le rendu paresseux voulu. Attendre que
    # les 5 soient encore marqués `data-processed` serait un faux positif. On se place donc
    # sur une slide qui porte un diagramme, et on vérifie qu'IL revient.
    if mermaid:
        c.ev("var m=document.querySelector('.mermaid'), i=Reveal.getIndices(m.closest('section'));"
             "Reveal.slide(i.h, i.v || 0)")
        c.pompe(1.8)
    c.journal.clear()
    avant = c.ev("document.documentElement.getAttribute('data-theme')")
    c.ev("document.getElementById('theme-toggle').click()")
    c.pompe(2.0)
    apres = c.ev("document.documentElement.getAttribute('data-theme')")
    v(f"bascule de thème ({avant} → {apres})", avant != apres and not c.journal, c.journal[:2])
    if mermaid:
        vus = c.ev("Reveal.getCurrentSlide().querySelectorAll('.mermaid[data-processed] svg').length")
        v("le diagramme visible est re-rendu après bascule", (vus or 0) > 0, f"({vus})")


def main():
    if shutil.which("google-chrome") is None:
        print("⊘ google-chrome absent — banc-deck sauté")
        return 0
    try:
        import websocket  # noqa: F401
    except ImportError:
        print("⊘ websocket-client absent (pip install websocket-client) — banc-deck sauté")
        return 0

    demandes = sys.argv[1:]
    decks = sorted(
        d for d in os.listdir(COURS)
        if os.path.isdir(os.path.join(COURS, d))
        and os.path.exists(os.path.join(COURS, d, "index.html"))
        and (not demandes or d in demandes)
    )
    if not decks:
        # Distinguer les deux cas : rien à vérifier (légitime) et un module demandé qui ne
        # correspond à rien (une faute de frappe, qui ne doit pas rendre vert).
        if demandes:
            dispo = sorted(d for d in os.listdir(COURS)
                           if os.path.exists(os.path.join(COURS, d, "index.html")))
            print(f"❌ banc-deck : aucun deck pour « {' · '.join(demandes)} ».")
            print(f"   Modules disponibles : {' · '.join(dispo)}")
            return 1
        print("⊘ aucun deck trouvé")
        return 0

    port = port_libre()
    serveur = subprocess.Popen([sys.executable, "serve.py", str(port)], cwd=RACINE,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    base = f"http://localhost:{port}"
    print(f"banc-deck — {len(decks)} deck(s), Chrome headless sur {base}")

    pbs = []
    c = None
    try:
        c = Chrome()
        for d in decks:
            verifier_deck(c, base, os.path.join(COURS, d), pbs)
    finally:
        if c:
            c.ferme()
        serveur.terminate()
        serveur.wait(timeout=10)

    print("\n✅ banc-deck : tout est vert\n" if not pbs
          else f"\n❌ banc-deck : {len(pbs)} problème(s)\n")
    return 1 if pbs else 0


if __name__ == "__main__":
    sys.exit(main())

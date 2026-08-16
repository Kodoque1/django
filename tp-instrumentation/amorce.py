"""
amorce.py — un Django complet, sans projet.

Aucun `django-admin startproject`, aucun `manage.py`, aucun serveur : ce fichier
configure Django, crée trois modèles, la base SQLite en mémoire et quelques
données. C'est la première cellule du TP.

Usage :

    python3 amorce.py          # vérifie que tout démarre, affiche un état
    exec(open("amorce.py").read())   # dans Jupyter / ipython

Ce qu'il ne fait PAS : définir des URL, des vues, des sérialiseurs. C'est votre
travail dans la fiche de TP.
"""

import django
from django.apps import AppConfig
from django.conf import settings

# Rejouer cette cellule dans un noyau déjà amorcé produirait des erreurs
# incompréhensibles (Django ne se laisse configurer qu'une fois). Autant le dire
# tout de suite, et en français.
if settings.configured:
    raise RuntimeError(
        "amorce.py a déjà été exécuté dans ce noyau.\n"
        "  · pour repartir des données de départ : semer()\n"
        "  · pour repartir vraiment de zéro : Kernel → Restart, puis rejouer cette "
        "cellule UNE seule fois."
    )


# --------------------------------------------------------------------------
# 1. Une « app » Django qui n'a pas de dossier
# --------------------------------------------------------------------------
# Normalement une app = un dossier avec models.py, views.py, apps.py. Ici l'app,
# c'est ce fichier — d'où name = "__main__". Django réclame quand même un chemin
# sur le disque : on le lui donne en dur, il ne s'en servira pas (pas de
# templates, pas de fichiers statiques, pas de migrations à lire).
class Boutique(AppConfig):
    name = "__main__"
    label = "boutique"
    path = "."


# --------------------------------------------------------------------------
# 2. Les réglages — l'équivalent de settings.py, en mémoire
# --------------------------------------------------------------------------
settings.configure(
    DEBUG=True,
    SECRET_KEY="tp-instrumentation-ipssi",
    ALLOWED_HOSTS=["*"],
    INSTALLED_APPS=[
        "django.contrib.contenttypes",
        "django.contrib.auth",
        "rest_framework",
        "rest_framework.authtoken",
        "__main__.Boutique",
    ],
    DATABASES={
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    },
    # La table des URL, c'est ce fichier aussi : Django ira chercher la variable
    # `urlpatterns` dans le module __main__ — celle que VOUS allez écrire.
    ROOT_URLCONF="__main__",
    MIDDLEWARE=[
        "django.middleware.security.SecurityMiddleware",
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.common.CommonMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
    ],
    SESSION_ENGINE="django.contrib.sessions.backends.signed_cookies",
    TEMPLATES=[
        {
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "APP_DIRS": False,
            "DIRS": [],
            "OPTIONS": {"context_processors": []},
        }
    ],
    REST_FRAMEWORK={"UNAUTHENTICATED_USER": "django.contrib.auth.models.AnonymousUser"},
    USE_TZ=True,
    DEFAULT_AUTO_FIELD="django.db.models.BigAutoField",
    LOGGING_CONFIG=None,  # on garde la main sur le logging (temps 3)
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],  # tests rapides
)

django.setup()


# --------------------------------------------------------------------------
# 3. Les modèles — le décor du TP
# --------------------------------------------------------------------------
from django.db import models  # noqa: E402  (après django.setup(), obligatoirement)


class Categorie(models.Model):
    nom = models.CharField(max_length=60)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.nom


class Produit(models.Model):
    nom = models.CharField(max_length=120)
    prix = models.DecimalField(max_digits=8, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name="produits")

    def __str__(self):
        return self.nom


class Avis(models.Model):
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name="avis")
    note = models.PositiveSmallIntegerField()
    texte = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name_plural = "avis"


# --------------------------------------------------------------------------
# 4. Créer les tables et semer des données
# --------------------------------------------------------------------------
def _creer_tables():
    """
    Crée le schéma. Deux mécanismes, volontairement séparés :

    - `migrate` joue les migrations livrées par contenttypes / auth / authtoken ;
    - le `schema_editor` crée nos trois tables à nous. Notre app n'a pas de dossier,
      donc pas de dossier `migrations/` — et c'est l'occasion de voir ce qu'une
      migration fait *en réalité* : appeler `create_model()`, rien de plus magique.
    """
    from django.core.management import call_command
    from django.db import connection

    call_command("migrate", verbosity=0)
    tables = connection.introspection.table_names()
    with connection.schema_editor() as editeur:
        for modele in (Categorie, Produit, Avis):
            if modele._meta.db_table not in tables:
                editeur.create_model(modele)


def semer():
    """
    Remet la base dans son état de départ. Rejouable autant de fois qu'on veut —
    et les identifiants sont **fixes** : le produit 1 est toujours le même, sinon
    la moitié des URL de la fiche tomberaient en 404 au deuxième essai.
    """
    Avis.objects.all().delete()
    Produit.objects.all().delete()
    Categorie.objects.all().delete()

    for i, (nom, slug) in enumerate(
        [("Claviers", "clavier"), ("Écrans", "ecran"), ("Audio", "audio")], start=1
    ):
        Categorie.objects.create(id=i, nom=nom, slug=slug)

    donnees = [
        ("Clavier mécanique 87 touches", "89.90", 12, 1),
        ("Clavier sans fil compact", "45.00", 30, 1),
        ("Écran 27 pouces 144 Hz", "329.00", 4, 2),
        ("Écran portable 15 pouces", "199.90", 0, 2),
        ("Casque à réduction de bruit", "149.00", 8, 3),
        ("Micro-cravate USB", "39.90", 21, 3),
        ("Tapis de souris XL", "19.90", 55, 1),
        ("Webcam 1080p", "59.00", 7, 2),
    ]
    avis_id = 0
    for i, (nom, prix, stock, cat) in enumerate(donnees, start=1):
        Produit.objects.create(id=i, nom=nom, prix=prix, stock=stock, categorie_id=cat)
        for note in (5, 4, 3)[: i % 3 + 1]:
            avis_id += 1
            Avis.objects.create(id=avis_id, produit_id=i, note=note, texte=f"avis {note}/5")
    return Produit.objects.count()


# --------------------------------------------------------------------------
# 5. Deux outils indispensables en notebook
# --------------------------------------------------------------------------
def recharger_urls():
    """
    À appeler CHAQUE FOIS que vous modifiez `urlpatterns`.

    Django met en cache l'arbre des routes au premier accès : sans ce rappel,
    vous testeriez encore l'ancienne table d'URL et vous chercheriez l'erreur
    pendant vingt minutes.
    """
    from django.urls import clear_url_caches, get_resolver

    clear_url_caches()
    return get_resolver()


def montrer(reponse):
    """Résumé d'une réponse HTTP en une ligne lisible."""
    corps = reponse.content[:120].decode("utf-8", "replace")
    try:
        vue = reponse.resolver_match.view_name
    except Exception:
        # Pas de vue appelée du tout — une redirection de middleware, un 404…
        vue = None
    lieu = reponse.headers.get("Location")
    return (
        f"{reponse.status_code} {reponse.reason_phrase}"
        + (f" → {lieu}" if lieu else "")
        + (f" [vue: {vue}]" if vue else "")
        + (f" {corps!r}" if corps else "")
    )


_creer_tables()

if __name__ == "__main__":
    n = semer()
    print(f"Django {django.get_version()} prêt — {n} produits, "
          f"{Categorie.objects.count()} catégories, {Avis.objects.count()} avis.")
    print("Apps :", ", ".join(a.label for a in django.apps.apps.get_app_configs()))

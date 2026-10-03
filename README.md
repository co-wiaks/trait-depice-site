# Trait d'Épice — site web (V1)

Site statique (HTML/CSS/JS, sans base de données ni e-commerce) : Accueil,
Nos épices (catalogue + une page par produit), Recettes, Notre histoire,
Professionnels, Contact — plus un espace `/admin` avec identifiants pour
gérer le catalogue sans toucher au code (voir plus bas).

## Ouvrir le site

Le site est déjà généré : ouvrez simplement `index.html` dans un navigateur,
ou déposez tout le dossier chez un hébergeur (voir « Héberger le site »).
L'espace `/admin`, lui, ne fonctionne qu'une fois le site en ligne sur
Netlify avec l'identité activée (voir « Mettre en place l'espace admin »).

## Structure du dossier

```
index.html, nos-epices.html, recettes.html,
notre-histoire.html, professionnels.html, contact.html   → pages du site (générées)
produits/*.html                                           → une page par épice (générées)
assets/css/style.css                                       → tous les styles
assets/js/main.js                                           → menu mobile, filtres, formulaires
assets/img/logo.png, icon-light.png, icon-dark.png          → votre logo (différentes versions selon le fond)
assets/img/favicon.png                                      → icône d'onglet
assets/img/produits/                                        → vos photos produit (ajoutées via /admin ou à la main)

admin/index.html, admin/config.yml   → l'espace de connexion pour gérer le catalogue
data/products/*.json        → un fichier par épice (source du catalogue — géré par /admin)
templates/pages/*.html      → le contenu de chaque page principale (éditable)
templates/produit.html      → le gabarit d'une fiche produit
build.js                    → le script qui génère toutes les pages ci-dessus
```

Les fichiers `.html` à la racine et dans `produits/` sont **générés** par
`build.js` à partir de `data/products/` et de `templates/`. Vous pouvez les
ouvrir et les modifier ponctuellement à la main, mais si vous relancez
`node build.js` (ou si l'espace `/admin` republie le site), ils seront
réécrits — donc pour un changement durable, modifiez plutôt le fichier
source correspondant.

## Gérer le catalogue depuis l'espace /admin (recommandé)

C'est la façon prévue pour ajouter, modifier ou retirer une épice une fois
le site en ligne, sans ouvrir aucun fichier :

1. Allez sur `https://votre-site.fr/admin`
2. Connectez-vous avec l'e-mail/mot de passe que vous aurez créés (voir la
   mise en place ci-dessous)
3. Cliquez sur une épice pour la modifier, ou « New Épices » pour en ajouter
   une : nom, famille, origine, description, profil aromatique, formats et
   prix, photo (glisser-déposer)
4. Cliquez « Publish » (ou « Publier ») : le site se régénère et se
   republie tout seul en une petite minute

### Mettre en place l'espace admin (une seule fois)

Cet espace a besoin d'un vrai hébergement Netlify connecté à un dépôt
GitHub pour fonctionner (c'est ce qui gère la connexion et republie le
site). Ce sont des clics dans des interfaces web, pas du code :

1. **Créer un compte GitHub** (gratuit) sur github.com, si vous n'en avez
   pas déjà un.
2. **Créer un nouveau dépôt** (« New repository »), et y envoyer tout le
   contenu de ce dossier. La façon la plus simple sans ligne de commande :
   sur la page du dépôt vide, « uploading an existing file », puis glissez-y
   tous les fichiers et dossiers.
3. **Créer un compte Netlify** (gratuit) sur netlify.com, connecté avec
   votre compte GitHub.
4. Sur Netlify : « Add new site » → « Import an existing project » →
   choisissez le dépôt que vous venez de créer. Laissez les réglages par
   défaut (il n'y a pas de build à configurer, ce sont des fichiers déjà
   générés) et cliquez « Deploy ».
5. Une fois le site déployé, allez dans **Site configuration → Identity**
   et cliquez « Enable Identity ».
6. Toujours dans Identity → **Services → Git Gateway**, cliquez « Enable
   Git Gateway » (c'est ce qui permet à `/admin` d'écrire dans votre dépôt
   GitHub à votre place).
7. Dans Identity → **Invite users**, entrez votre propre e-mail : vous
   recevrez un lien pour créer votre mot de passe.
8. Ouvrez le lien reçu, créez votre mot de passe → vous êtes redirigée vers
   `/admin` déjà connectée.

Une fois ces étapes faites, vous n'y revenez plus : au quotidien, vous
utilisez uniquement `/admin` comme décrit plus haut. Je peux vous
accompagner pas à pas sur ces étapes le jour où vous voulez vous lancer.

## Ajouter, modifier ou retirer une épice à la main (sans /admin)

Chaque épice est un fichier dans `data/products/`, par exemple
`data/products/piment-fort.json` :

```json
{
  "nom": "Piment Fort",
  "famille": "Piments",
  "origine": "Espagne",
  "nouveau": true,
  "description": "...",
  "image": "",
  "dot": "#B5372A",
  "profil": [{"label": "Intensité forte"}, {"label": "Fumé, chaud"}, {"label": "Origine Espagne"}],
  "formats": [{"poids": "50 g", "prix": "3,90 €"}, {"poids": "100 g", "prix": "6,50 €", "defaut": true}]
}
```

- Le nom du fichier (`piment-fort.json`) devient l'adresse de la fiche
  (`produits/piment-fort.html`) — sans espaces ni accents.
- `famille` détermine automatiquement le filtre du catalogue (pas besoin de
  gérer une famille séparée).
- `image` : chemin vers une photo dans `assets/img/produits/` (ex.
  `/assets/img/produits/piment-fort.jpg`) — laissez vide pour garder la
  pastille de couleur `dot` en attendant.
- `nouveau` : `true` pour afficher le badge « Nouveau », sinon `false` ou
  supprimez la ligne.
- Pour une nouvelle épice : dupliquez un fichier existant, changez son nom
  et son contenu.

Une fois le(s) fichier(s) modifié(s), régénérez le site :

```
node build.js
```

(Node.js doit être installé sur votre ordinateur — téléchargeable sur
nodejs.org. Voir la conversation précédente pour le détail pas à pas.)

## Changer le logo vous-même

1. Remplacez `assets/img/logo.png` par votre nouveau fichier.
2. Le site utilise en réalité deux versions détourées, générées à partir de
   celui-ci : `icon-light.png` (fonds clairs) et `icon-dark.png` (fonds
   sombres, sans zones blanches). Si vous changez de logo, dites-le-moi et
   je regénère ces deux versions à partir du nouveau fichier — c'est un
   traitement d'image spécifique, pas un simple remplacement de fichier.

## Formulaires (Contact / Professionnels)

En V1, sans back-end, le bouton « Envoyer » ouvre la messagerie de la
personne avec le message pré-rempli (adresse, sujet et contenu). C'est
volontairement simple et ne nécessite aucun serveur.

L'adresse utilisée est définie **une seule fois**, en haut de `build.js` :

```js
const EMAIL = 'contact@traitdepice.fr';
```

Remplacez-la par votre adresse définitive, puis relancez `node build.js`.

Plus tard, si vous voulez un vrai formulaire (envoi silencieux, sans ouvrir
la messagerie du visiteur), il faudra un petit service d'envoi de mail
(ex. Formspree, Resend) — on pourra le brancher à ce moment-là sans changer
le design.

## Héberger le site

Pour profiter de l'espace `/admin`, l'hébergement doit être **Netlify**
connecté à **GitHub** (voir « Mettre en place l'espace admin » ci-dessus) —
c'est gratuit pour un site de cette taille.

Si vous ne voulez pas de l'espace `/admin` et préférez un hébergement
classique (OVH, o2switch...), le site reste 100 % compatible : il suffit
d'envoyer tout le contenu du dossier (sauf `templates/`, `data/`,
`build.js` et ce README, qui ne servent qu'à la maintenance) à la racine
de l'hébergement — mais dans ce cas, chaque modification repasse par
`node build.js` en local puis un renvoi des fichiers.

## Autres éléments gérables depuis /admin

- **Halal / Casher** : sur chaque fiche épice, deux cases à cocher affichent
  un badge « Halal » et/ou « Casher » sous le nom du produit. Ce sont des
  badges génériques (pas le logo d'un organisme certificateur) — si vous
  avez une vraie certification et son logo officiel, envoyez-le-moi pour
  qu'il remplace ces badges.
- **Recherche** : la page « Nos épices » a une barre de recherche par nom,
  combinable avec les filtres par famille — rien à configurer.
- **Présentoirs** : un onglet « Présentoirs » dans `/admin` permet de gérer
  les meubles présentés sur la page Professionnels (nom, capacité, photo,
  description) — actuellement les formats 26 et 46 épices.

## Prochaines étapes possibles

- Ajouter vos vraies photos produit via `/admin` (au fur et à mesure).
- Ajouter la photo du présentoir 26 épices via `/admin`.
- Ajouter le e-commerce (paiement, panier) quand vous serez prête — la
  structure du catalogue s'y prête déjà.
- Brancher un vrai envoi de formulaire côté serveur.
- Nom de domaine + e-mail professionnel (`contact@traitdepice.fr`).

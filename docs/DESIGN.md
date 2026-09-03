# TrellTech — Design system

Direction visuelle de la refonte. Objectif : une interface de gestion de tableaux
soignée, moderne et distinctive, qui évite l'esthétique « template AI » générique.
Claire par défaut, dark mode natif, responsive du mobile au grand écran.

## Principes

1. **Lisible avant tout.** Le board est dense en information ; hiérarchie typographique
   nette, espacements réguliers, pas de décoration gratuite.
2. **Une seule échelle.** Espacements, rayons, ombres et couleurs viennent de tokens.
   Aucune valeur magique dans les composants.
3. **Mouvement discret.** Transitions courtes (150–200 ms), le drag & drop est fluide,
   jamais de rebond tape-à-l'œil.
4. **Thème clair et sombre équivalents.** Les deux sont conçus, pas l'un dérivé de l'autre.

## Tokens de couleur

Définis en variables CSS sur `:root` (clair) et `.dark` (sombre). Palette de marque
autour d'un indigo, neutres chauds légers.

| Rôle              | Clair       | Sombre      |
| ----------------- | ----------- | ----------- |
| `--bg`            | `#f7f7f9`   | `#0e0e12`   |
| `--surface`       | `#ffffff`   | `#17171d`   |
| `--surface-muted` | `#f1f1f4`   | `#1f1f27`   |
| `--border`        | `#e5e5ea`   | `#2a2a33`   |
| `--text`          | `#1a1a1f`   | `#f2f2f5`   |
| `--text-muted`    | `#6b6b76`   | `#9a9aa6`   |
| `--brand`         | `#5b5bd6`   | `#7c7cf0`   |
| `--brand-hover`   | `#4a4ac2`   | `#8f8ff5`   |
| `--danger`        | `#e5484d`   | `#ff6369`   |
| `--success`       | `#30a46c`   | `#3dd68c`   |

Les cartes peuvent porter un liseré de couleur d'étiquette (label), mais **pas** de
couleur aléatoire par carte (l'ancien code le faisait, à ne pas reproduire).

## Typographie

- **Interface** : Inter (déjà envisagé). Titres en poids 600, corps en 400/500.
- **Marque / logo** : Fredoka (utilisé dans l'ancienne version, à garder pour l'identité).
- Échelle : 12 / 13 / 14 (base) / 16 / 20 / 24 / 32.

## Rayons & ombres

- Rayons : `--r-sm: 6px`, `--r-md: 10px`, `--r-lg: 14px`.
- Ombres légères, en deux niveaux seulement : `--shadow-sm` (cartes au repos),
  `--shadow-md` (carte en drag, menus, modales).

## Composants clés

- **Sidebar workspaces** : rail vertical, avatars/initiales des workspaces, repli/déploiement
  des boards. Remplace l'ancienne sidebar en `T.T` par un logo Fredoka propre.
- **Board** : colonnes horizontales scrollables, en-tête de board avec titre éditable et actions.
- **Liste (colonne)** : en-tête avec nom + compteur de cartes + menu (renommer, supprimer),
  bouton « + Ajouter une carte » en bas, largeur fixe confortable (~280px).
- **Carte** : titre, éventuelles étiquettes (pastilles de couleur), date d'échéance,
  survol révélant les actions. Drag & drop via **@dnd-kit** (pas vuedraggable).
- **Modales & toasts maison** : remplacent `prompt()` natif et SweetAlert. Une modale
  accessible (focus trap, échap pour fermer) et un système de toasts pour les retours.
- **États vides** : chaque écran vide (pas de workspace, board sans liste) a un message
  clair et une action primaire.

## Accessibilité

- Contraste AA minimum sur texte et éléments interactifs.
- Navigation clavier complète, focus visible.
- `prefers-reduced-motion` respecté (désactive les transitions non essentielles).
- `prefers-color-scheme` comme valeur initiale du thème, surchargée par un toggle persistant.

## À NE PAS refaire (dettes de l'ancienne version)

- Couleur de carte aléatoire à chaque rendu.
- Logique métier (appels API) mélangée dans les templates.
- `prompt()`/`alert()` natifs et SweetAlert.
- Token Trello lu depuis `localStorage` côté navigateur → désormais tout passe par l'API.

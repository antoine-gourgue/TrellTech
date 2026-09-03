# TrellTech — Direction UX des nouvelles surfaces

Complète `docs/DESIGN.md` (tokens, thème, composants de base). Même langage visuel :
indigo de marque, neutres chauds, dark mode équivalent, transitions 150–200 ms,
`prefers-reduced-motion` respecté. Tout reste construit sur les composants maison.

## Sidebar workspace — contenus multiples

La sidebar ne liste plus seulement les boards. Chaque workspace se déplie en trois
groupes : **Tableaux**, **Docs**, **Whiteboards**. Chacun avec son icône (board,
document, tableau blanc), un bouton « + » pour créer, et l'élément actif surligné.
Sidebar repliable sur mobile. Un workspace vide propose de créer son premier contenu.

## Modale de détail de carte (Tier 1)

Ouverte au clic sur une carte, en overlay centré, large mais pas plein écran,
scrollable, fermable par Échap / clic dehors / bouton. Structure :
- **En-tête** : titre éditable inline, liste d'appartenance (« dans la liste X »).
- **Barre d'actions** : membres, étiquettes, échéance, checklist, pièce jointe.
- **Étiquettes** : pastilles colorées ; popover pour créer/choisir/éditer les labels du board.
- **Échéance** : sélecteur de date ; case « terminé » qui barre la date.
- **Description** : éditeur Markdown (aperçu rendu, bascule édition).
- **Checklists** : titre, barre de progression, items cochables, ajout/suppression, drag pour réordonner.
- **Commentaires** : zone de saisie + fil chronologique avec avatar, auteur, date relative.
- **Activité** : journal discret sous les commentaires (repliable).
- **Membres** : avatars empilés ; popover d'assignation.
Optimistic updates partout ; les changements se reflètent aussi sur la carte du board
(couverture, pastilles, compteur de checklist, avatars, icône commentaire).

## Temps réel (Tier 2)

Le board s'abonne au WebSocket `/ws`. À la réception d'un `RealtimeEvent` d'un autre
utilisateur (actorId ≠ soi), mettre à jour le cache react-query du board sans recharger.
Indicateur discret de présence/connexion. **Partage** : bouton « Partager » sur le board,
modale pour inviter par nom d'utilisateur avec rôle (éditeur/lecteur), liste des membres
avec avatars et gestion des rôles. **Notifications** : cloche dans l'en-tête avec pastille
de compte non-lu, panneau déroulant listant les notifications, clic → ouvre la carte/board.

## Vues & productivité (Tier 3)

- **Sélecteur de vue** sur le board : Tableau (défaut) / Calendrier / Table.
- **Calendrier** : cartes avec échéance positionnées ; clic ouvre la carte.
- **Table** : lignes = cartes, colonnes = liste, étiquettes, membres, échéance ; triable.
- **Réordonnancement des listes** en drag & drop (poignée sur l'en-tête de colonne), via @dnd-kit.
- **Filtres** : barre pour filtrer par étiquette / membre / échéance.
- **Palette de commandes (Cmd-K)** : recherche globale (boards, cartes, docs) + actions rapides
  (créer une carte, aller à un board). Accessible clavier de bout en bout.
- **Archives** : accès aux éléments archivés (closed) avec restauration.

## Docs type Notion (Tier 4)

Éditeur à blocs plein. **Utiliser BlockNote** (`@blocknote/core`, `@blocknote/react`,
`@blocknote/mantine`) : éditeur Notion-like prêt à l'emploi (blocs, menu slash « / »,
glisser-réordonner, titres, listes, cases à cocher, tables, code, citations). Le document
BlockNote (JSON) est sauvegardé dans `Doc.blocks` via `PATCH /api/docs/:id` en **autosave
débounce** (~800 ms). En-tête de doc : emoji/icône choisissable + titre éditable. Thème de
l'éditeur synchronisé au thème clair/sombre de l'app. Placer BlockNote dans un composant
client-only (dynamique, `ssr:false`) pour éviter les soucis SSR.

## Whiteboards Excalidraw (Tier 5)

Intégrer la librairie officielle **`@excalidraw/excalidraw`** (composant React) en
client-only (`dynamic(..., {ssr:false})`). Charger la `scene` depuis `Whiteboard.scene`
(`initialData = {elements, appState, files}`), sauvegarder via `PATCH /api/whiteboards/:id`
en autosave débounce sur `onChange`. Forcer le thème Excalidraw (`theme="light"|"dark"`)
selon le thème de l'app. Titre éditable en en-tête. Importer le CSS d'Excalidraw.

## Accessibilité (rappel)

Focus visible et navigation clavier sur la modale de carte, la palette Cmd-K, les popovers
et les menus. Contraste AA. Les overlays piègent le focus et se ferment à Échap.

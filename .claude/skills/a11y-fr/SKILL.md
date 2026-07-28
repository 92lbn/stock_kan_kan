---
name: a11y-fr
description: Règles d'accessibilité et de langue de l'app (interface 100% française, usage mobile debout en cuisine). À charger avant tout travail sur un composant UI, un formulaire, la navigation, ou les couleurs/contraste. Fixe contraste AA, cibles tactiles, focus visible, ARIA, et l'interdiction de la couleur seule.
---

# Accessibilité — français, cuisine, mobile

L'app est utilisée 30 fois/jour, souvent d'une main, debout, dans un passe. Tout doit être
lisible et cliquable dans ces conditions.

## Règles non négociables

- **Contraste AA minimum** (4,5:1 texte normal, 3:1 grand texte) sur TOUTES les paires.
  ⚠️ `text-zinc-400` en nav inactive échoue aujourd'hui — à corriger.
- **Cibles tactiles ≥ 44×44 px.** Les boutons `size="sm"` (32 px) portant "Supprimer" sont
  trop petits. Tout bouton d'action destructive : 44 px de hauteur minimum.
- **Focus visible OBLIGATOIRE.** Jamais d'`outline-none` sans anneau de remplacement net.
  Les Input/Select/Textarea actuels cassent ça — anneau de focus visible partout.
- **`aria-current="page"`** sur le lien de navigation actif.
- **`aria-hidden="true"`** sur les icônes purement décoratives.
- **Jamais la couleur seule** comme porteuse d'information : double toujours d'un texte, d'une
  icône ou d'un motif (ex. une alerte de stock = couleur + libellé + icône).
- **Tous les libellés en français.** Pas de texte anglais visible par l'utilisateur.

## Formulaires

- Chaque champ a un `<label>` associé (`htmlFor`/`id`).
- Messages d'erreur en français, reliés au champ (`aria-describedby`), cohérents avec les
  règles de validation réelles (ne pas dire "8 caractères" si le schéma accepte 4).

## Dialogs / confirmations

- `<ConfirmAction>` : dialog accessible, focus trap, `Échap` pour fermer, bouton destructif
  visuellement distinct, `role="dialog"` + `aria-modal`.

## Thème

- Sélecteur clair/sombre/système persisté, sans flash au chargement.
- `viewport.themeColor` doit suivre le thème réel (ne pas figer une couleur sombre en thème clair).

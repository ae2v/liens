# AE2V — gestionnaire de partage

## Résultat attendu

Le domaine `liens.ae2v.fr` réunit trois usages dans une seule application : une page publique de liens, des redirections courtes mesurables et un générateur de QR codes. L’administration est protégée par un mot de passe temporaire, avant migration vers `auth.ae2v.fr`.

## Décisions

- **Architecture :** Next.js App Router sur le projet Vercel existant, avec Postgres serverless Neon.
- **Administration :** session HTTP-only signée côté serveur. Le mot de passe n’est jamais exposé au navigateur ni stocké dans Git.
- **Données :** paramètres de page, éléments, liens courts, événements de clic et QR enregistrés dans Postgres.
- **Conditions :** plusieurs règles combinées avec `ET` ou `OU` (début, fin, année, jours de semaine).
- **Réseaux :** icônes Lucide, bibliothèque libre et cohérente. Discord utilise l’API publique d’invitation pour le nombre de membres en ligne.
- **Partage :** fenêtre avec QR, copie, réseaux compatibles et partage natif du système.
- **Liens courts :** slug choisi ou aléatoire de quatre caractères, expiration configurable et statistiques sans cookie.
- **Métadonnées :** les robots sociaux reçoivent une page Open Graph ; les visiteurs sont redirigés.

## Direction visuelle

- **Surface publique :** inspection rapide, identité puis liens immédiatement visibles.
- **Surface admin :** outil de commande dense, état et actions avant toute décoration.
- **Palette :** rouge AE2V `#d60106`, encre `#171717`, papier `#f4f3ef`, blanc `#ffffff`, gris `#6f706b`.
- **Typographie :** Geist Sans pour la lecture et les contrôles, Geist Mono uniquement pour les slugs et statistiques.
- **Signature :** une ligne rouge verticale à cinq repères, écho discret aux cinq filières. Aucun triangle décoratif.
- **Forme :** rayons contenus, bordures fines, ombres réservées aux superpositions.

### Mobile

```text
[logo]         [partager]
     AE2V
  bio très courte
 [réseaux sociaux]
 ┃ [lien principal]
 ┃ [lien]
 ┃ [compte à rebours]
      ae2v.fr
```

### Bureau

```text
       [page publique compacte, centrée et lisible]

[navigation admin] [liste / filtres / édition et aperçu]
```

## Limites assumées de cette version

- Le mot de passe temporaire sera remplacé par Google Workspace via `auth.ae2v.fr`.
- Les statistiques conservent uniquement le moment, le référent, le pays Vercel et une catégorie d’appareil ; aucune empreinte personnelle n’est créée.
- Le compteur Discord dépend de l’activation du widget de serveur ou des données publiques de l’invitation.

## Critères de validation

- La page publique affiche uniquement les éléments actifs dont les conditions sont vraies.
- Un administrateur peut créer, modifier, ordonner, mettre en avant et supprimer les éléments.
- Les liens courts redirigent, expirent proprement et comptabilisent les visites.
- Les QR sont téléchargeables en SVG et PNG, avec logo AE2V central.
- Les parcours principaux fonctionnent au clavier et à 390, 768, 1440 et 1920 px.

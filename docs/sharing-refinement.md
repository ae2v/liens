# Évolution du gestionnaire de partage

- Surface publique : profil compact puis liens ; admin : liste, détail, actions.
- Priorités : lien mis en avant, destination, compte à rebours/communauté, ouvrir.
- Données : événements de clic enregistrés en base ; nombres Discord fournis par l’API, jamais simulés. Ce sont des clics, pas des visiteurs uniques.
- Mobile : `profil > réseaux > liens prioritaires > autres liens` ; admin `navigation > liste > détail > statistiques`.
- Bureau : même colonne publique (structure Linktree demandée) ; admin `navigation | liste/détail + QR | statistiques`.
- Système : rouge AE2V pour actions et mise en avant, fond clair, typographie existante, rythme 8 px, contrôles 44 px, icônes existantes.
- Signature : mise en avant rouge sobre et décompte à deux unités ; suppression des rails latéraux.
- Risques : débordement des actions sur mobile et absence de données externes. Prévoir repli Discord, erreurs et états vides explicites.
- Linktree : échéance demandée le 20 septembre 2026 à 22 h, Europe/Paris (20 h UTC), conservée comme date fixe.

## Mise en ligne

La structure de la base existante suffit : aucune migration destructive. Exécuter `node scripts/add-linktree.mjs` depuis le projet pour ajouter l’élément demandé, puis pousser la branche. Le script est idempotent et préserve tout élément Linktree déjà présent. Si un élément existe déjà, régler son compte à rebours au 20/09/2026 22:00 dans l’admin (heure de Paris).

Dans Configuration, tester puis connecter l’invitation permanente du serveur. Le total des membres et le nombre en ligne sont des estimations de Discord, rafraîchies toutes les 60 secondes. Source : https://docs.discord.com/developers/resources/invite#get-invite

Les statistiques proviennent de `click_events` : total, 7/30/90 jours, série journalière en heure de Paris, appareils, pays et provenance. Ce ne sont pas des visiteurs uniques. Les anciens événements restent conservés ; le filtrage de robots s’applique aux nouveaux clics. Les QR associés aux éléments pointent vers une redirection suivie ; les QR de liens courts utilisent leur slug existant. Un QR direct externe n’est pas mesurable par ce site.

## Vérification

Contrôles locaux : compilation Next.js/TypeScript, ESLint, `node scripts/check-sharing.mjs`, export QR PNG, refus d’accès anonyme aux API admin et statistiques, rejet des couleurs QR invalides. Le PNG a été inspecté visuellement ; la lecture par caméra reste à vérifier sur téléphone.

La base distante et la publication n’ont pas été accessibles dans l’environnement réseau restreint. Aucun résultat de statistiques ni de connexion Discord n’a été simulé dans l’application.

Vérification visuelle encore nécessaire dans un navigateur à 390×844, 768×1024, 1440×900, 1920×1080 et 2560×1080 : décompte à deux unités, cartes longues, navigation à quatre onglets, fiche de lien et panneau QR. Tester l’édition/enregistrement, une redirection réelle puis l’incrément du compteur, l’expiration, et la connexion/déconnexion Discord avec la base accessible.

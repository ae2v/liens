# Déploiement Vercel

- Projet Vercel : `ae2v/liens`
- Dépôt source : `ae2v/liens`, branche `main`
- Domaine prévu : `liens.ae2v.fr`
- Base : ressource Neon `liens-db` avec Neon Auth ; les tables applicatives ont été restaurées depuis la sauvegarde du 22 septembre 2026
- Variables applicatives : `ADMIN_PASSWORD`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`

Les secrets sont gérés dans Vercel. Ne pas les ajouter au dépôt. Les commits sur `main` doivent déclencher les déploiements de production depuis GitHub.

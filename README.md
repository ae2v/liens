# Tous nos liens — AE2V

Gestionnaire de partage de l’AE2V : page de liens, liens courts, QR codes et statistiques.

## Développement

```bash
npm install
npm run db:migrate
npm run dev
```

Variables requises :

- `DATABASE_URL` : base Postgres Neon ;
- `ADMIN_PASSWORD` : mot de passe temporaire de `/admin` ;
- `SESSION_SECRET` : clé aléatoire de signature des sessions ;
- `NEXT_PUBLIC_SITE_URL` : URL canonique du site.

## Déploiement

Le dépôt est relié au projet Vercel `tous-nos-liens` et à la base Neon `tous-nos-liens-db`. Chaque push sur `main` déploie automatiquement `liens.ae2v.fr`.

Les décisions fonctionnelles et visuelles sont documentées dans [`docs/SPEC.md`](docs/SPEC.md).

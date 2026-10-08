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
- `SESSION_SECRET` : clé aléatoire de chiffrement des sessions ;
- `NEXT_PUBLIC_SITE_URL` et `APP_URL` : URL canonique du site ;
- `SSO_ISSUER`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `ROLE_CLAIM_NAMESPACE` : client OIDC du SSO AE2V. L’URI de retour est `/api/auth/callback` et le rôle requis est `admin`.

## Déploiement

Le dépôt est relié au projet Vercel `liens` et à la base Neon `liens-db`. Chaque push sur `main` déploie automatiquement `liens.ae2v.fr`.

Les décisions fonctionnelles et visuelles sont documentées dans [`docs/SPEC.md`](docs/SPEC.md).

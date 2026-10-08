import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
export function LoginForm({ error }: { error?: boolean }) {
  return <form className="login-panel" action="/api/auth/login" method="get">
    <div className="login-mark"><Image src="/assets/logo-ae2v.svg" alt="AE2V" width={58} height={16} priority /></div>
    <div><h1>Administration</h1><p>Gère la page, les liens courts et les QR codes.</p></div>
    <p>Accès réservé aux comptes Google Workspace autorisés dans le SSO AE2V.</p>
    {error && <p className="form-error" role="alert">Connexion refusée ou expirée. Réessaie avec un compte autorisé pour Liens.</p>}
    <button className="primary-button"><LockKeyhole size={18} />Se connecter avec Google Workspace</button>
    <Link href="/">Retour à la page publique</Link>
  </form>;
}

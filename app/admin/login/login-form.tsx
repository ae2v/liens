"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  return <form className="login-panel" action={action}>
    <div className="login-mark"><Image src="/assets/logo-ae2v.svg" alt="AE2V" width={58} height={16} priority /></div>
    <div><h1>Administration</h1><p>Gère la page, les liens courts et les QR codes.</p></div>
    <label>Mot de passe temporaire<input name="password" type="password" autoComplete="current-password" autoFocus required /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="primary-button" disabled={pending}><LockKeyhole size={18} />{pending ? "Vérification…" : "Se connecter"}</button>
    <Link href="/">Retour à la page publique</Link>
  </form>;
}

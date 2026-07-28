---
name: server-action-security
description: Checklist OBLIGATOIRE pour toute server action ou route handler qui lit/écrit des données. À charger dès qu'on écrit ou modifie un fichier dans src/lib/actions/ ou src/app/api/. Couvre garde d'auth, validation Zod, scoping userId, propriété des IDs, revalidation, erreurs typées.
---

# Sécurité des Server Actions — checklist non négociable

Une server action est un endpoint POST public. N'importe qui avec une session peut l'appeler
avec les arguments qu'il veut. Traite chaque action comme une frontière de confiance.

Pour CHAQUE action, dans cet ordre :

1. **Garde d'auth en PREMIÈRE ligne.** `await requireAdmin()` ou `await getCurrentUser()` /
   `requireSession()` avant toute autre chose. Jamais de lecture/écriture avant la garde.
   Les actions admin utilisent `requireAdmin` ; les actions d'un employé sur SES données
   utilisent `getCurrentUser` puis scopent par `user.id`.

2. **Validation Zod de TOUS les inputs**, y compris les arguments passés hors FormData (IDs).
   `safeParse` → retour d'erreur si `!success`. Ne fais jamais confiance au type déclaré.

3. **Scoping par userId** sur toute donnée appartenant à un utilisateur. Une lecture/écriture
   qui touche les notes, pointages, abonnements push, etc. DOIT filtrer par `userId` dans le
   `where`. Exemple du bug corrigé : `deleteMany({ where: { endpoint, userId } })`, jamais
   `{ endpoint }` seul.

4. **Ne jamais faire confiance à un ID client sans vérifier la propriété.** Un `itemId` ou
   `shiftId` venu du client doit être vérifié : soit le `where` inclut le `userId`, soit on
   charge l'objet et on compare le propriétaire avant d'agir.

5. **`revalidatePath` de TOUTES les routes impactées.** Un mouvement de stock touche `/stock`
   ET le dashboard `/`. Une écriture compta touche `/comptabilite` ET `/`. Liste-les toutes.

6. **Retour d'erreur typé, jamais de `throw` nu** pour les erreurs métier attendues. Le pattern
   du repo : `type ActionState = { error: string } | undefined`. `redirect()` est l'exception
   (control-flow volontaire). Ne laisse jamais fuiter un message d'erreur Prisma brut au client.

7. **Écritures liées → `db.$transaction`.** Décrément de stock + création du mouvement, etc.,
   dans une seule transaction. Lis l'état courant DANS la transaction pour les invariants
   (ex. refuser un OUT qui passe sous zéro).

Rappel : le proxy fait un check optimiste de session, il ne remplace PAS ces gardes.

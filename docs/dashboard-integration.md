# Connexion de Dashboard Kankan aux données Planning

Dashboard Kankan reste un dépôt et un déploiement séparés, mais les trois applications partagent le même projet Supabase `stock_kan_kan`. L’application Planning expose uniquement une API de lecture pour les responsables :

- `GET /api/dashboard?vue=planning&semaine=AAAA-MM-JJ`
- `GET /api/dashboard?vue=pointages&mois=AAAA-MM&employe=tous`

Chaque requête doit envoyer le jeton Supabase Auth du Dashboard dans l’en-tête `Authorization: Bearer …`. Planning vérifie ce jeton auprès du projet Supabase commun, contrôle l’origine et vérifie que l’adresse appartient à la liste des comptes responsables existants.

## Variables Vercel de l’application Planning

```text
DASHBOARD_SUPABASE_URL=https://<ref-dashboard>.supabase.co
DASHBOARD_SUPABASE_ANON_KEY=<clé publique Dashboard>
DASHBOARD_ALLOWED_ORIGINS=https://<url-dashboard>
DASHBOARD_MANAGER_EMAILS=responsable1@exemple.fr,responsable2@exemple.fr
```

Aucun identifiant de la base Planning n’est transmis au Dashboard ou au navigateur. L’API est en lecture seule et ne permet pas de modifier les créneaux ou les pointages.

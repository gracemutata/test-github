# test-github

API REST de gestion de taches avec Node.js et Express.

## Demarrage du projet

Prerequis : Node.js 22 ou une version recent.

```sh
npm install
npm start
```

Adresse : http://localhost:3000. La variable d'environnement `PORT` permet de changer le port.
`npm run dev` active le rechargement automatique. `npm test` lance les tests.

## Routes

| Methode | Route | Description |
| --- | --- | --- |
| GET | /api/health | Etat du serveur |
| GET | /api/tasks | Liste des taches |
| GET | /api/tasks/:id | Detail d'une tache |
| POST | /api/tasks | Creation d'une tache |
| PATCH | /api/tasks/:id | Modification partielle |
| DELETE | /api/tasks/:id | Suppression |

Exemple de corps JSON pour POST :

```json
{ "title": "Apprendre REST", "completed": false }
```

`title` est obligatoire a la creation, entre 1 et 200 caracteres apres suppression des espaces aux extremites.
`completed` est un booleen facultatif, faux par defaut. PATCH accepte ces deux champs,
avec au moins un champ fourni. Les autres champs sont refuses.

Exemple PowerShell :

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/tasks -Method Post -ContentType 'application/json' -Body '{"title":"Apprendre REST"}'
Invoke-RestMethod -Uri http://localhost:3000/api/tasks
```

Les reponses sont en JSON (sauf DELETE : 204 sans contenu). Les erreurs utilisent
la forme `{ "error": "message" }` avec un statut HTTP adapte : 400, 404, 413 ou 500.

Les donnees sont stockees en memoire et perdues au redemarrage. Cette base locale
n'inclut ni authentification ni base de donnees et ne doit pas etre exposee telle quelle en production.

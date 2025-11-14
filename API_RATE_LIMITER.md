# API Rate Limiter

Ce système de rate limiting optimise les appels à l'API 42 pour éviter les erreurs 429 (Too Many Requests).

## Fonctionnalités

### 1. **Queue System (File d'attente)**
Toutes les requêtes API passent par une queue qui les traite séquentiellement, évitant ainsi de surcharger l'API.

### 2. **Token Rotation (Rotation des tokens)**
Le système utilise jusqu'à 6 tokens API différents en rotation, permettant de multiplier la limite de rate par le nombre de tokens disponibles.

### 3. **Retry avec Exponential Backoff**
En cas d'erreur 429:
- Première tentative: attend 1 seconde
- Deuxième tentative: attend 2 secondes  
- Troisième tentative: attend 4 secondes
- Maximum 3 tentatives avant d'abandonner

### 4. **Délai minimum entre requêtes**
Un délai de 100ms minimum est respecté entre chaque requête pour éviter de spam l'API.

### 5. **Cache avec données stale**
Si le rate limit est atteint et qu'il existe des données en cache (même périmées), celles-ci sont retournées plutôt que d'échouer complètement.

## Configuration

### Variables d'environnement requises

Le système essaie d'utiliser jusqu'à 6 paires de credentials:

```env
# Token 1 (requis)
NEXT_PUBLIC_CLIENT_ID=your_client_id
CLIENT_SECRET_NEXT1=your_client_secret

# Tokens 2-6 (optionnels, mais recommandés)
CLIENT_ID2=your_client_id_2
CLIENT_SECRET2=your_client_secret_2

CLIENT_ID3=your_client_id_3
CLIENT_SECRET3=your_client_secret_3

CLIENT_ID4=your_client_id_4
CLIENT_SECRET4=your_client_secret_4

CLIENT_ID5=your_client_id_5
CLIENT_SECRET5=your_client_secret_5

CLIENT_ID6=your_client_id_6
CLIENT_SECRET6=your_client_secret_6
```

Plus vous avez de tokens, meilleure sera la performance et la résilience face au rate limiting.

## Utilisation

### Dans les routes API

```typescript
import { apiRateLimiter } from "@/lib/api-rate-limiter";

// Au lieu de:
// const response = await fetch(`https://api.intra.42.fr/v2/users/${login}`);

// Utilisez:
const response = await apiRateLimiter.fetch(`/users/${login}`);
```

Le rate limiter s'occupe automatiquement de:
- Gérer le token d'authentification
- Mettre la requête en queue
- Respecter les délais
- Retry en cas d'erreur 429

### Monitoring

```typescript
// Voir la taille actuelle de la queue
const queueSize = apiRateLimiter.getQueueSize();
console.log(`Requêtes en attente: ${queueSize}`);

// Vider la queue (utile pour le cleanup)
apiRateLimiter.clearQueue();
```

## Fichiers modifiés

Les fichiers suivants ont été mis à jour pour utiliser le rate limiter:

- `/app/api/users/[login]/intra/route.tsx` - Données utilisateur
- `/app/api/users/[login]/events/route.tsx` - Événements utilisateur
- `/app/api/events/[campus_name]/route.tsx` - Événements campus
- `/app/api/events/[campus_name]/[event_id]/subscribers/route.tsx` - Abonnés événements
- `/app/api/events/[campus_name]/[event_id]/feedbacks/route.tsx` - Feedbacks événements

## Avantages

1. **Réduction drastique des erreurs 429** - Les requêtes sont espacées et gérées intelligemment
2. **Meilleure utilisation des quotas** - La rotation de tokens multiplie la capacité
3. **Résilience** - En cas de rate limit, retry automatique ou retour de cache stale
4. **Performance** - Les requêtes parallèles du client sont séquencées côté serveur
5. **Transparence** - Le code client n'a pas besoin d'être modifié, juste remplacer `fetch` par `apiRateLimiter.fetch`

## Logs

Le système log les informations importantes:

```
[API Rate Limiter] Initialized with 6 tokens
[API Rate Limiter] Rate limited, retrying...
[API Rate Limiter] Max retries reached for request
[WARN] Rate limited fetching user hbelle. Serving stale cache.
```

## Notes

- Le système est un singleton, il n'y a qu'une seule instance partagée dans toute l'application
- Les tokens sont récupérés au premier appel et réutilisés
- La queue est automatiquement processée dès qu'une requête arrive
- En production, configurez autant de tokens que possible pour de meilleures performances

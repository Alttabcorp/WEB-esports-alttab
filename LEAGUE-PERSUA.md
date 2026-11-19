# League Persua — Coach estatístico LoL

App Next.js que analisa o histórico do jogador via Riot API e recomenda campeões/builds com **Wilson score**, **amostra mínima** e **lift** vs o WR geral do próprio jogador.

Persistência em **PostgreSQL** (`league_persua`), cache em **Redis**, rate limit calibrado da key Riot.

## Rate limits Riot (App ID 364635)

| Janela | Limite |
|--------|--------|
| 1 segundo | 20 requests |
| 2 minutos | 100 requests |

O gargalo prático é a janela de **100/2 min**. Cache Redis + snapshot Postgres evitam reconsultar a Riot a cada refresh.

## Setup local

```bash
cp .env.example .env.local
# Cole RIOT_API_KEY em .env.local

npm install
npm run infra:up          # Postgres :5436 + Redis :6380
npm run db:migrate        # na primeira vez (ou db:deploy)
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variáveis locais

```
DATABASE_URL=postgresql://league_persua:league_persua_dev@127.0.0.1:5436/league_persua?schema=public
REDIS_URL=redis://:league_persua_redis_dev@127.0.0.1:6380
RIOT_API_KEY=...
RIOT_APP_ID=364635
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run infra:up` | Sobe Postgres + Redis (Compose) |
| `npm run infra:down` | Para containers |
| `npm run compose:up` | Stack completo (infra + app Docker) |
| `npm run db:generate` | Gera Prisma Client |
| `npm run db:migrate` | Cria/aplica migration (dev) |
| `npm run db:deploy` | Aplica migrations (prod/CI) |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Testes do Stats Engine |

## Postgres compartilhado (servidor)

Padrão Alttab: **um database por app** no mesmo Postgres.

```bash
/home/garcon/infra/postgres/scripts/criar-servico.sh league_persua
```

Depois aponte o `.env`:

```
# Host / tunnel
DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/league_persua?schema=public

# App na rede Docker "servicos"
DATABASE_URL=postgresql://USER:PASS@postgres:5432/league_persua?schema=public
```

Nesse modo não suba o serviço `postgres` do Compose deste repo (`--profile local-db`); use só Redis (e/ou Redis da rede `servicos`) + `npm run db:deploy`.

## Arquitetura

1. Resolve summoner (Riot) → upsert `Player` no PG.
2. Se existir `AnalysisRun` fresco (~20 min) → devolve snapshot (sem Riot).
3. Senão: match IDs → Redis → PG → Riot (só miss) → agrega → grava `Match` / `PlayerMatch` / `AnalysisRun` + stats densas → Redis.

## Landing legada

Arquivos HTML estáticos da ALTTAB (`index.html`, `lol-data.html`, `public/...`) permanecem no repo e não são servidos pelo Next neste MVP.

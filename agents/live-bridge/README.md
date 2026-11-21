# Live Bridge (PC → League Persua)

Roda **no PC onde o LoL está aberto**. Lê:

- **LCU** (champ select / draft) via `lockfile`
- **Live Client** `https://127.0.0.1:2999` (em partida)

e envia pro servidor com `phase`: `idle` | `draft` | `loading` | `inGame`.

## Jeito automático (Windows, mesma rede)

1. Instale [Node.js LTS](https://nodejs.org/) **uma vez** (Add to PATH)
2. No Persua: **Config → Baixar Atualizar-e-Iniciar.bat**
3. No PC do LoL, dê dois cliques no `.bat` (sem administrador)
4. Ele baixa o bridge de `http://SEU-IP:3001/bridge/…`, grava o `.env`, cria atalho na **Inicialização** do Windows e sobe o agente
5. No 2º monitor abra **`/coach`**

A cada login (ou ao rodar o `.bat` de novo), os arquivos são atualizados do servidor.

## Jeito manual

1. Copie esta pasta `live-bridge` para o PC de jogo
2. Baixe o `.env` em Config e coloque aqui
3. Dois cliques em **`Iniciar-Bridge.bat`**

> Não é um `.exe` nativo: é `.bat` + Node.

## Requisitos

- Node.js 20+
- Cliente LoL aberto (lockfile) para draft; **em partida** para LCD
- PC alcança o Persua na rede (`PERSUA_URL`)

## Lockfile

Por padrão o bridge procura em:

- `C:\Riot Games\League of Legends\lockfile`
- `%LOCALAPPDATA%\Riot Games\League of Legends\lockfile`

Se o LoL estiver em outro disco, defina `LOCKFILE_PATH` no `.env`.

## Alternativa manual

```bash
cp .env.example .env
# edite PERSUA_URL e LIVE_AGENT_TOKEN
npm start
# ou: node bridge.mjs
```

## Firewall

O bridge **sai** do PC para o servidor — não precisa expor portas do LoL na LAN.

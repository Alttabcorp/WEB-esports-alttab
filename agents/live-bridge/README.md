# Live Client Bridge (PC → League Persua)

Roda **no PC onde o LoL está aberto**. Lê `https://127.0.0.1:2999` e envia pro servidor.

## Jeito mais fácil (Windows)

1. No servidor, abra **Config → Bridge do PC de jogo**
2. Clique **Baixar .env do bridge** (já traz token + URL + PUUID)
3. Copie esta pasta `live-bridge` para o PC de jogo
4. Coloque o arquivo baixado aqui como `.env` (renomeie se precisar)
5. Instale [Node.js LTS](https://nodejs.org/) **uma vez**
6. Dê dois cliques em **`Iniciar-Bridge.bat`**
7. Deixe a janela aberta e jogue — no Ao vivo deve aparecer **Bridge PC online**

> Não é um `.exe` nativo: é um atalho `.bat` + Node. Evita instalar empacotador e atualiza fácil.

## Onde pegar o `LIVE_AGENT_TOKEN`?

- **Config do site** (recomendado): copiar / baixar `.env`
- Ou no servidor: variável `LIVE_AGENT_TOKEN` no `.env` / `.env.local`

## Requisitos

- Node.js 20+
- LoL **em partida** (porta 2999 só existe in-game)
- PC alcança o Persua na rede (`PERSUA_URL`, ex. `http://192.168.x.x:3001`)

## Alternativa manual

```bash
cp .env.example .env
# edite PERSUA_URL e LIVE_AGENT_TOKEN
npm start
# ou: node bridge.mjs
```

## Firewall

O bridge **sai** do PC para o servidor — não precisa expor a porta 2999 na LAN.

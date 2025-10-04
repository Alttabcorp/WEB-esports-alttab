import { aggregateItemStats, renderStatsTable } from '../item-stats.js';
const API_BASE = 'https://ddragon.leagueoflegends.com/cdn';
const LANG = 'pt_BR';
const MAX_ITEMS = 6;
let version = '15.19.1';
let allItems = [];
let selectedItems = [];
// Funções utilitárias para campeões (baseado em champions-example.js)
async function getChampions(version) {
  const url = `${API_BASE}/${version}/data/${LANG}/champion.json`;
  const res = await fetch(url);
  const data = await res.json();
  return Object.values(data.data);
}

async function getChampionDetails(version, champId) {
  const url = `${API_BASE}/${version}/data/${LANG}/champion/${champId}.json`;
  const res = await fetch(url);
  const data = await res.json();
  return data.data[champId];
}

function parseSpellText(text, spell) {
  if (!text) return '';
  text = text.replace(/\{\{\s*e(\d+)\s*\}\}/g, (match, n) => {
    const idx = parseInt(n, 10);
    return spell.effectBurn && spell.effectBurn[idx] ? spell.effectBurn[idx] : match;
  });
  text = text.replace(/\{\{\s*([af])(\d+)\s*\}\}/g, (match, type, n) => {
    if (!spell.vars) return match;
    const key = type + n;
    const found = spell.vars.find(v => v.key === key);
    if (found) {
      return Array.isArray(found.coeff) ? found.coeff.join('/') : found.coeff;
    }
    return match;
  });
  text = text.replace(/\{\{\s*cost\s*\}\}/g, spell.costBurn || '');
  text = text.replace(/\{\{\s*cooldown\s*\}\}/g, spell.cooldownBurn || '');
  return text;
}

let allChampions = [];
let selectedChampionId = null;

function renderChampionSelect(champions) {
  const select = document.getElementById('champion-select');
  select.innerHTML = '<option value="">Selecione...</option>' +
    champions.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  select.onchange = async function() {
    selectedChampionId = this.value;
    if (selectedChampionId) {
      await renderChampionAbilities(selectedChampionId);
    } else {
      document.getElementById('champion-abilities').innerHTML = '';
    }
  };
}

async function renderChampionAbilities(champId) {
  const champ = await getChampionDetails(version, champId);
  const abilitiesEl = document.getElementById('champion-abilities');
  if (!champ) {
    abilitiesEl.innerHTML = '<div style="color:#888">Campeão não encontrado.</div>';
    return;
  }
  const passiveUrl = `${API_BASE}/${version}/img/passive/${champ.passive.image.full}`;
  // Pega stats agregados dos itens
  const stats = aggregateItemStats(selectedItems);
  abilitiesEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px;">
      <img src="${API_BASE}/${version}/img/champion/${champ.image.full}" alt="${champ.name}" style="width:48px;height:48px;border-radius:8px;border:2px solid #0596aa;background:#181c23;">
      <h2 style="margin:0;">${champ.name} <small style="font-size:16px;opacity:.7;">(${champ.title})</small></h2>
    </div>
    <p style="margin-top:0;font-size:15px;">${champ.lore}</p>
    <h3 style="margin-bottom:4px;">Habilidades</h3>
    <ul style="list-style:none;padding:0;">
      <li style="margin-bottom:16px;background:#222;padding:8px;border-radius:6px;">
        <b>Passiva:</b> <span title="${champ.passive.description}">${champ.passive.name}</span><br>
        <img src="${passiveUrl}" alt="${champ.passive.name}" style="width:40px;vertical-align:middle;margin:4px 0;"> <br>
        <small>${champ.passive.description}</small>
      </li>
      ${champ.spells.map(spell => {
        // Futuramente: aplicar stats nos cálculos de dano
        return `
        <li style=\"margin-bottom:16px;background:#222;padding:8px;border-radius:6px;\">
          <b>${spell.name}</b> <span style=\"color:#0596aa;\">(${spell.id})</span><br>
          <img src=\"${API_BASE}/${version}/img/spell/${spell.image.full}\" alt=\"${spell.name}\" style=\"width:32px;vertical-align:middle;\"> <br>
          <small><b>Dica:</b> ${parseSpellText(spell.tooltip || spell.description, spell)}</small><br>
          <small><b>Descrição:</b> ${parseSpellText(spell.description, spell)}</small><br>
          <small><b>Custo:</b> ${spell.costBurn} | <b>Alcance:</b> ${spell.rangeBurn} | <b>Tempo de Recarga:</b> ${spell.cooldownBurn}</small>
        </li>
        `;
      }).join('')}
    </ul>
  `;
}
// (mantido apenas no topo do arquivo)
async function getLatestVersion() {
  const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  const versions = await res.json();
  return versions[0];
}

async function getItems(version) {
  const url = `${API_BASE}/${version}/data/${LANG}/item.json`;
  const res = await fetch(url);
  const data = await res.json();
  // Filtra apenas itens compráveis e com imagem
  return Object.entries(data.data)
    .map(([id, item]) => ({ id, ...item }))
    .filter(item => item.gold && item.gold.purchasable && item.image && item.image.full);
}

function renderItemList(items) {
  const listEl = document.getElementById('item-list');
  listEl.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card' + (selectedItems.find(i => i.id === item.id) ? ' selected' : '');
    card.innerHTML = `
      <img src="${API_BASE}/${version}/img/item/${item.image.full}" alt="${item.name}">
      <div style="font-size:14px;">${item.name}</div>
      <div style="font-size:12px;opacity:.7;">${item.gold.total}g</div>
    `;
    card.onclick = () => selectItem(item);
    listEl.appendChild(card);
  });
}

function renderSelectedItems() {
  const selEl = document.getElementById('selected-items');
  selEl.innerHTML = '';
  for (let i = 0; i < MAX_ITEMS; i++) {
    const item = selectedItems[i];
    const slot = document.createElement('div');
    slot.className = 'selected-slot';
    if (item) {
      slot.innerHTML = `<img src="${API_BASE}/${version}/img/item/${item.image.full}" alt="${item.name}">
        <button class="remove-btn" title="Remover">×</button>`;
      slot.querySelector('.remove-btn').onclick = e => {
        e.stopPropagation();
        removeItem(item.id);
      };
    } else {
      slot.innerHTML = '<span style="color:#666;">+</span>';
    }
    selEl.appendChild(slot);
  }
  // Exibe stats agregados
  const statsEl = document.getElementById('item-stats');
  if (statsEl) {
    const stats = aggregateItemStats(selectedItems);
    statsEl.innerHTML = renderStatsTable(stats);
  }
  // Atualiza habilidades do campeão se houver um selecionado
  if (typeof selectedChampionId !== 'undefined' && selectedChampionId) {
    renderChampionAbilities(selectedChampionId);
  }
}

function selectItem(item) {
  if (selectedItems.find(i => i.id === item.id)) return;
  if (selectedItems.length >= MAX_ITEMS) return;
  selectedItems.push(item);
  renderSelectedItems();
  renderItemList(filterItems(document.getElementById('item-search-input').value));
}

function removeItem(id) {
  selectedItems = selectedItems.filter(i => i.id !== id);
  renderSelectedItems();
  renderItemList(filterItems(document.getElementById('item-search-input').value));
}

function filterItems(query) {
  query = (query || '').toLowerCase();
  return allItems.filter(item => item.name.toLowerCase().includes(query));
}

document.getElementById('item-search-input').addEventListener('input', e => {
  renderItemList(filterItems(e.target.value));
});

async function main() {
  version = await getLatestVersion();
  allItems = await getItems(version);
  renderSelectedItems();
  renderItemList(allItems);
  // Campeões
  allChampions = await getChampions(version);
  renderChampionSelect(allChampions);
}
main();

// Arquivo principal modular do lol-data
import { aggregateItemStats, renderStatsTable } from './item-stats.js';
const API_BASE = 'https://ddragon.leagueoflegends.com/cdn';
const LANG = 'pt_BR';
let version = '15.19.1';
let allItems = [];
let allChampions = [];
let selectedChampionId = null;

async function getItems(version) {
    const url = `${API_BASE}/${version}/data/${LANG}/item.json`;
    const res = await fetch(url);
    const data = await res.json();
    return Object.entries(data.data)
        .map(([id, item]) => ({ id, ...item }))
        .filter(item => item.gold && item.gold.purchasable && item.image && item.image.full);
}

async function getChampions(version) {
    const url = `${API_BASE}/${version}/data/${LANG}/champion.json`;
    const res = await fetch(url);
    const data = await res.json();
    return Object.values(data.data);
}

function renderItemList(items) {
    const listEl = document.getElementById('builder-item-results');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items.length) {
        listEl.innerHTML = '<div style="color:#888;padding:16px;">Nenhum item encontrado.</div>';
        return;
    }
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${API_BASE}/${version}/img/item/${item.image.full}" alt="${item.name}" style="width:48px;height:48px;border-radius:8px;border:2px solid #0596aa;background:#181c23;">
            <div style="font-size:15px;font-weight:bold;">${item.name}</div>
            <div style="font-size:12px;opacity:.7;">${item.gold.total}g</div>
            <div style="font-size:12px;opacity:.8;margin:4px 0;">${item.tags ? item.tags.join(', ') : ''}</div>
            <div style="font-size:12px;opacity:.8;max-height:32px;overflow:hidden;">${item.plaintext || item.description.replace(/<[^>]+>/g, '').slice(0, 60) + '...'}</div>
        `;
        listEl.appendChild(card);
    });
}

function renderChampionList(champions) {
    const listEl = document.getElementById('champion-list');
    if (!listEl) return;
    // Campo de busca
    let searchEl = document.getElementById('champion-search-input');
    if (!searchEl) {
        const searchDiv = document.createElement('div');
        searchDiv.style.marginBottom = '12px';
        searchDiv.innerHTML = `
            <input id="champion-search-input" type="search" placeholder="Buscar campeão..." style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid #222;background:#181c23;color:#fff;outline:none;">
        `;
        listEl.parentNode.insertBefore(searchDiv, listEl);
        searchEl = searchDiv.querySelector('#champion-search-input');
        searchEl.addEventListener('input', () => {
            renderChampionList(
                allChampions.filter(c => c.name.toLowerCase().includes(searchEl.value.toLowerCase()) || c.tags.join(',').toLowerCase().includes(searchEl.value.toLowerCase()))
            );
        });
    } else {
        searchEl.value = searchEl.value || '';
    }
    // Renderiza cards simples
    listEl.innerHTML = '';
    champions.forEach(champ => {
        const card = document.createElement('div');
        card.className = 'champion-card' + (selectedChampionId === champ.id ? ' selected' : '');
        card.innerHTML = `
            <img src="${API_BASE}/${version}/img/champion/${champ.image.full}" alt="${champ.name}" style="width:48px;height:48px;border-radius:8px;border:2px solid #0596aa;background:#181c23;">
            <div style="font-size:15px;font-weight:bold;">${champ.name}</div>
            <div style="font-size:12px;opacity:.7;">${champ.tags.join(', ')}</div>
        `;
        card.onclick = () => {
            selectedChampionId = champ.id;
            renderChampionList(allChampions);
            renderChampionDetails(champ.id);
        };
        listEl.appendChild(card);
    });
}

function renderChampionDetails(champId) {
    const detailsEl = document.getElementById('champion-details');
    if (!detailsEl) return;
    const champ = allChampions.find(c => c.id === champId);
    if (!champ) {
        detailsEl.innerHTML = '<div style="color:#888">Campeão não encontrado.</div>';
        return;
    }
    // Badge de função
    const tag = champ.tags && champ.tags.length ? champ.tags[0] : '';
    const tagColor = tag === 'Fighter' ? '#0596aa' : tag === 'Mage' ? '#a259ea' : tag === 'Assassin' ? '#e94560' : tag === 'Tank' ? '#4ecdc4' : tag === 'Support' ? '#f7b801' : tag === 'Marksman' ? '#f9844a' : '#cbd5e1';
    detailsEl.innerHTML = `
        <div style="background:#181c23;border-radius:14px;padding:18px 18px 12px 18px;box-shadow:0 2px 12px 0 rgba(5,150,170,0.10);border:2px solid #222;">
          <div style="display:flex;align-items:center;gap:18px;">
            <img src="${API_BASE}/${version}/img/champion/${champ.image.full}" alt="${champ.name}" style="width:72px;height:72px;border-radius:12px;border:3px solid #0596aa;background:#181c23;">
            <div>
              <div style="font-size:1.2rem;font-weight:700;color:#fff;">${champ.name}</div>
              <div style="font-size:0.95rem;opacity:.7;text-transform:uppercase;letter-spacing:0.04em;">${champ.title}</div>
              <span style="display:inline-block;margin-top:6px;padding:2px 12px;font-size:0.85rem;font-weight:600;border-radius:12px;background:${tagColor};color:#fff;">${tag}</span>
            </div>
          </div>
          <div style="margin-top:14px;font-size:0.98rem;line-height:1.5;color:#cbd5e1;max-width:320px;">${champ.lore.slice(0, 180)}${champ.lore.length > 180 ? '...' : ''}</div>
        </div>
    `;
}

async function main() {
    // Busca versão mais recente
    try {
        const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await res.json();
        version = versions[0];
    } catch (e) {}
    allItems = await getItems(version);
    allChampions = await getChampions(version);
    renderItemList(allItems);
    renderChampionList(allChampions);
    // Busca dinâmica de itens
    const itemSearch = document.getElementById('builder-item-search');
    if (itemSearch) {
        itemSearch.addEventListener('input', e => {
            renderItemList(allItems.filter(item => item.name.toLowerCase().includes(e.target.value.toLowerCase())));
        });
    }
}

document.addEventListener('DOMContentLoaded', main);
// Renderização de campeões
import { getChampionDataset, getDatasetConfig } from '../data/state.js';
import { escapeHtml, sanitizeUrlSegment, truncateText, renderRating, debounce } from '../utils/helpers.js';

export function initializeChampionSection() {
    const container = document.getElementById('champion-list');
    const countEl = document.getElementById('champion-count');
    const roleSelect = document.getElementById('champion-role');
    const searchInput = document.getElementById('champion-search');

    if (!container || !countEl) {
        return;
    }

    const championDataset = getChampionDataset();
    
    countEl.textContent = championDataset.length.toString();
    container.innerHTML = '';

    if (roleSelect) {
        populateChampionRoles(roleSelect, championDataset);
        if (!roleSelect.dataset.bound) {
            roleSelect.addEventListener('change', applyChampionFilters);
            roleSelect.dataset.bound = 'true';
        }
    }

    if (searchInput && !searchInput.dataset.bound) {
        const triggerFilter = debounce(() => applyChampionFilters(), 180);
        searchInput.addEventListener('input', triggerFilter);
        searchInput.dataset.bound = 'true';
    }

    renderChampionCards(championDataset);
}

function populateChampionRoles(select, dataset) {
    if (!select) {
        return;
    }

    select.innerHTML = '<option value="all">Todas</option>';

    const roles = new Set();
    dataset.forEach(champion => {
        (champion.tags || []).forEach(tag => roles.add(tag));
    });

    const sortedRoles = Array.from(roles).sort((a, b) => a.localeCompare(b));

    sortedRoles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        select.appendChild(option);
    });
}

function applyChampionFilters() {
    const searchValue = document.getElementById('champion-search')?.value.trim().toLowerCase() || '';
    const roleValue = document.getElementById('champion-role')?.value || 'all';
    const countEl = document.getElementById('champion-count');

    const championDataset = getChampionDataset();
    let filtered = championDataset;

    if (roleValue !== 'all') {
        filtered = filtered.filter(champion => champion.tags?.includes(roleValue));
    }

    if (searchValue) {
        filtered = filtered.filter(champion => {
            const fields = [champion.name, champion.title, champion.blurb].join(' ').toLowerCase();
            return fields.includes(searchValue);
        });
    }

    countEl.textContent = filtered.length;
    renderChampionCards(filtered);
}

function renderChampionCards(champions) {
    const container = document.getElementById('champion-list');
    const datasetConfig = getDatasetConfig();

    if (!champions.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-circle-exclamation"></i> Nenhum campeão encontrado com os filtros atuais.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    champions.forEach(champion => {
        const card = document.createElement('article');
        card.className = 'data-card';
        card.innerHTML = `
            <div class="data-card-thumb">
                <img loading="lazy" src="${datasetConfig.championImageBase}${sanitizeUrlSegment(champion.image?.full)}" alt="${escapeHtml(champion.name)}" onerror="this.onerror=null;this.src='public/images/players/player-top.jpg';">
            </div>
            <div class="data-card-body">
                <div class="data-card-header">
                    <h3>${escapeHtml(champion.name)}</h3>
                    <p class="data-card-subtitle">${escapeHtml(champion.title)}</p>
                </div>
                <div class="data-badge-group">
                    ${(champion.tags || []).map(tag => `<span class="data-badge">${escapeHtml(tag)}</span>`).join('')}
                </div>
                <p class="data-card-text">${escapeHtml(truncateText(champion.blurb || '', 220))}</p>
                <div class="data-card-meta">
                    <div class="meta-item"><span class="meta-label">Dificuldade</span><span class="meta-value">${renderRating(champion.info?.difficulty)}</span></div>
                    <div class="meta-item"><span class="meta-label">Ataque</span><span class="meta-value">${renderRating(champion.info?.attack)}</span></div>
                    <div class="meta-item"><span class="meta-label">Defesa</span><span class="meta-value">${renderRating(champion.info?.defense)}</span></div>
                    <div class="meta-item"><span class="meta-label">Magia</span><span class="meta-value">${renderRating(champion.info?.magic)}</span></div>
                </div>
            </div>
        `;
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}
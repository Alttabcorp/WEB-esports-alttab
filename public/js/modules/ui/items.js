// Renderização de itens
import { getItemDataset, getDatasetConfig } from '../data/state.js';
import { escapeHtml, sanitizeUrlSegment, truncateText, stripHtml, formatGold, debounce } from '../utils/helpers.js';

export function initializeItemSection() {
    const container = document.getElementById('item-list');
    const countEl = document.getElementById('item-count');
    const categorySelect = document.getElementById('item-category');
    const searchInput = document.getElementById('item-search');

    if (!container || !countEl) {
        return;
    }

    const itemDataset = getItemDataset();
    countEl.textContent = itemDataset.length.toString();
    container.innerHTML = '';

    if (categorySelect) {
        populateItemCategories(categorySelect, itemDataset);
        if (!categorySelect.dataset.bound) {
            categorySelect.addEventListener('change', applyItemFilters);
            categorySelect.dataset.bound = 'true';
        }
    }

    if (searchInput && !searchInput.dataset.bound) {
        const triggerFilter = debounce(() => applyItemFilters(), 180);
        searchInput.addEventListener('input', triggerFilter);
        searchInput.dataset.bound = 'true';
    }

    renderItemCards(itemDataset);
}

export function populateItemCategories(select, dataset) {
    if (!select) {
        return;
    }

    select.innerHTML = '<option value="all">Todas</option>';

    const categories = new Set();
    dataset.forEach(item => {
        (item.tags || []).forEach(tag => categories.add(tag));
    });

    const sorted = Array.from(categories).sort((a, b) => a.localeCompare(b));

    sorted.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });
}

function applyItemFilters() {
    const searchValue = document.getElementById('item-search')?.value.trim().toLowerCase() || '';
    const categoryValue = document.getElementById('item-category')?.value || 'all';
    const countEl = document.getElementById('item-count');

    const itemDataset = getItemDataset();
    let filtered = itemDataset;

    if (categoryValue !== 'all') {
        filtered = filtered.filter(item => item.tags?.includes(categoryValue));
    }

    if (searchValue) {
        filtered = filtered.filter(item => {
            const description = stripHtml(item.description || '').toLowerCase();
            const fields = [item.name, item.plaintext, description].join(' ').toLowerCase();
            return fields.includes(searchValue);
        });
    }

    countEl.textContent = filtered.length;
    renderItemCards(filtered);
}

function renderItemCards(items) {
    const container = document.getElementById('item-list');
    const datasetConfig = getDatasetConfig();

    if (!items.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-circle-exclamation"></i> Nenhum item corresponde aos filtros selecionados.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const card = document.createElement('article');
        card.className = 'data-card';

        const itemDescription = truncateText(item.plaintext || stripHtml(item.description || ''), 200);
        const goldTotal = item.gold?.total ?? 0;
        const goldSell = item.gold?.sell ?? 0;
        const purchasable = item.gold?.purchasable !== false;

        card.innerHTML = `
            <div class="data-card-thumb">
                <img loading="lazy" src="${datasetConfig.itemImageBase}${sanitizeUrlSegment(item.image.full)}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null;this.src='public/images/logo-alttab.png';">
            </div>
            <div class="data-card-body">
                <div class="data-card-header">
                    <h3>${escapeHtml(item.name)}</h3>
                    <p class="data-card-subtitle">${purchasable ? 'Disponível na loja' : 'Não disponível na loja'}</p>
                </div>
                <div class="data-badge-group">
                    ${(item.tags || []).map(tag => `<span class="data-badge">${escapeHtml(tag)}</span>`).join('')}
                </div>
                <p class="data-card-text">${escapeHtml(itemDescription)}</p>
                <div class="data-card-meta">
                    <div class="meta-item"><span class="meta-label">Custo</span><span class="meta-value">${formatGold(goldTotal)}</span></div>
                    <div class="meta-item"><span class="meta-label">Venda</span><span class="meta-value">${formatGold(goldSell)}</span></div>
                    ${item.into?.length ? `<div class="meta-item"><span class="meta-label">Melhora em</span><span class="meta-value">${item.into.length} itens</span></div>` : ''}
                    ${item.requiredChampion ? `<div class="meta-item"><span class="meta-label">Requer</span><span class="meta-value">${escapeHtml(item.requiredChampion)}</span></div>` : ''}
                </div>
            </div>
        `;
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}
/**
 * Funções relacionadas aos slots da build
 */
import { API_BASE, currentVersion, allItems, builderState } from '../config.js';
import { updateBuilderStats } from '../stats/stats.js';
import { removeItemFromBuild } from './items.js';

/**
 * Renderizar slots da build
 */
export function renderBuildLoadout() {
    const container = document.getElementById('builder-loadout-slots');
    const counterEl = document.getElementById('builder-loadout-counter');
    const costEl = document.getElementById('builder-total-cost');
    
    if (counterEl) {
        counterEl.textContent = `${builderState.items.length}/${builderState.maxItems}`;
    }
    
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calcular custo total
    let totalCost = 0;
    const selectedItemsData = builderState.items.map(itemId => {
        const item = allItems.find(i => i.id.toString() === itemId);
        if (item) totalCost += item.gold?.total || 0;
        return item;
    }).filter(Boolean);
    
    if (costEl) {
        costEl.innerHTML = `${totalCost} <i class="fas fa-coins"></i>`;
    }
    
    // Renderizar slots
    for (let i = 0; i < builderState.maxItems; i++) {
        const slot = document.createElement('div');
        slot.className = 'builder-slot';
        
        const item = selectedItemsData[i];
        if (item) {
            slot.classList.add('filled');
            slot.innerHTML = `
                <button type="button" class="builder-slot-remove" aria-label="Remover ${item.name}">
                    <i class="fas fa-times"></i>
                </button>
                <div class="builder-slot-thumb">
                    <img loading="lazy" src="${API_BASE}/${currentVersion}/img/item/${item.image.full}" 
                         alt="${item.name}" onerror="this.onerror=null;this.src='public/images/logo-alttab.png';">
                </div>
                <div class="builder-slot-info">
                    <span class="builder-slot-name">${item.name}</span>
                    <span class="builder-slot-gold">${item.gold?.total || 0} <i class="fas fa-coins"></i></span>
                </div>
            `;
            
            slot.addEventListener('click', () => removeItemFromBuild(item.id));
        } else {
            slot.innerHTML = `
                <span class="builder-slot-index">${i + 1}</span>
                <span class="builder-slot-placeholder">Slot vazio</span>
            `;
        }
        
        container.appendChild(slot);
    }
    
    // Verificar se estamos no modo responsivo para configurar slots interativos
    setupInteractiveBuildSlots();
}

/**
 * Configuração de slots interativos para mobile
 */
export function setupInteractiveBuildSlots() {
    const slotsContainer = document.getElementById('builder-loadout-slots');
    if (!slotsContainer) return;
    if (!isMobile()) return;
    
    Array.from(slotsContainer.children).forEach((slot, idx) => {
        slot.style.cursor = 'pointer';
        slot.onclick = function(e) {
            e.stopPropagation();
            window.showItemPickerModal(allItems);
            window.__selectItemForSlot = function(itemId) {
                builderState.items[idx] = itemId.toString();
                renderBuildLoadout();
                updateBuilderStats();
                if (document.getElementById('item-picker-modal')) {
                    document.getElementById('item-picker-modal').style.display = 'none';
                }
                window.__selectItemForSlot = null;
            };
        };
    });
}

/**
 * Verificar se estamos em tela de dispositivo móvel
 */
export function isMobile() {
    return window.innerWidth <= 900;
}

/**
 * Ocultar seção de itens no modo responsivo
 */
export function hideItemSectionOnMobile() {
    const itemSection = document.getElementById('builder-panel-items');
    if (itemSection && isMobile()) {
        itemSection.parentNode.removeChild(itemSection);
    } else if (itemSection) {
        itemSection.style.display = '';
    }
}
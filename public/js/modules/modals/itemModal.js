/**
 * Modal de seleção de itens
 */
import { API_BASE, currentVersion } from '../config.js';

/**
 * Modal para exibir detalhes de um item
 */
export function showItemDetailsModal(item) {
    if (document.getElementById('item-details-modal')) {
        document.getElementById('item-details-modal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'item-details-modal';
    modal.style = 'display:flex; position:fixed; z-index:9999; left:0; top:0; width:100vw; height:100vh; background:rgba(10,18,32,0.92); align-items:center; justify-content:center;';
    
    modal.innerHTML = `
      <div style="background:#151c2c; border-radius:1.2rem; padding:2.2rem 2.2rem 1.5rem 2.2rem; min-width:320px; max-width:96vw; max-height:90vh; box-shadow:0 8px 32px #000a; display:flex; flex-direction:column; gap:1.2rem;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem;">
          <h3 style="margin:0; font-size:1.15rem;">${item.name}</h3>
          <button id="close-item-details" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;"><i class='fas fa-times'></i></button>
        </div>
        <div style='display:flex;gap:1.2rem;align-items:flex-start;'>
          <img src='${API_BASE}/${currentVersion}/img/item/${item.image.full}' alt='${item.name}' style='width:64px;height:64px;border-radius:0.7rem;background:#222;object-fit:cover;box-shadow:0 2px 8px #0004;'>
          <div style='flex:1;'>
            <div style='color:#fff;font-size:1.01rem;margin-bottom:0.7rem;'>${item.plaintext || ''}</div>
            <div style='color:#bcd; font-size:0.97rem;'>${item.description || ''}</div>
            <div style='color:#aaa; font-size:0.93rem; margin-top:0.7rem;'>Custo: ${item.gold?.total || 0} <i class="fas fa-coins"></i></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-item-details').onclick = () => {
        modal.remove();
    };
}

/**
 * Modal para seleção de itens (móvel)
 */
export function showItemPickerModal(items) {
    if (document.getElementById('item-picker-modal')) {
        document.getElementById('item-picker-modal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'item-picker-modal';
    modal.style = 'display:flex; position:fixed; z-index:9999; left:0; top:0; width:100vw; height:100vh; background:rgba(10,18,32,0.92); align-items:center; justify-content:center;';
    
    modal.innerHTML = `
      <div style="background:#151c2c; border-radius:1.2rem; padding:2.2rem 1.2rem 1.5rem 1.2rem; min-width:220px; max-width:98vw; max-height:98vh; box-shadow:0 8px 32px #000a; display:flex; flex-direction:column; gap:1.2rem; height:90vh;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem;">
          <h3 style="margin:0; font-size:1.15rem;">Selecionar Item</h3>
          <button id="close-item-picker" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;"><i class='fas fa-times'></i></button>
        </div>
        <input id="item-search-input" type="text" placeholder="Buscar item..." style="padding:0.6rem 1rem; border-radius:0.7rem; border:1px solid #233; background:#101624; color:#fff; font-size:1rem; outline:none; margin-bottom:0.7rem;" />
        <div id="item-table-container" style="flex:1 1 0; min-height:0; height:100%;"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-item-picker').onclick = () => {
        modal.style.display = 'none';
    };
    
    function renderItemTable(filter = '') {
        const container = document.getElementById('item-table-container');
        const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        const filtered = filter ? sorted.filter(i => i.name.toLowerCase().includes(filter.toLowerCase())) : sorted;
        
        if (!filtered.length) {
            container.innerHTML = '<div style="color:#aaa; text-align:center; padding:1.5rem;">Nenhum item encontrado</div>';
            return;
        }
        
        container.innerHTML = `<div style="display:grid; grid-template-columns:repeat(2,1fr); gap:1.1rem 0.7rem; max-height:60vh; overflow-y:auto;">${filtered.map(item => `
            <button class="item-table-btn" data-item-id="${item.id}" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:0.5rem;padding:0.6rem 0.1rem;background:#1e263a;border-radius:0.8rem;border:1px solid #233;cursor:pointer;transition:.2s;outline:none;min-width:0;min-height:0;width:110px;overflow:hidden;box-sizing:border-box;">
                <img src='${API_BASE}/${currentVersion}/img/item/${item.image.full}' alt='${item.name}' style='width:38px;height:38px;border-radius:0.6rem;background:#222;object-fit:cover;box-shadow:0 2px 8px #0004;'>
                <span style="color:#fff;font-size:${item.name.length > 14 ? '0.82rem' : '0.92rem'};font-weight:600;text-align:center;line-height:1.2;white-space:normal;word-break:break-word;max-width:90px;">${item.name}</span>
            </button>
        `).join('')}</div>`;
        
        container.querySelectorAll('.item-table-btn').forEach(btn => {
            btn.onclick = () => {
                const itemId = btn.getAttribute('data-item-id');
                if (window.__selectItemForSlot) {
                    window.__selectItemForSlot(itemId);
                } else {
                    const itemObj = items.find(i => i.id == itemId);
                    showItemDetailsModal(itemObj);
                }
            };
        });
    }
    
    document.getElementById('item-search-input').oninput = (e) => {
        renderItemTable(e.target.value);
    };
    
    renderItemTable();
}
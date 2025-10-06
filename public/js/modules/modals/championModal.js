/**
 * Funções para gerenciar as modais de campeões
 */
import { API_BASE, currentVersion, allChampions, builderState } from '../config.js';
import { renderChampionSummary } from '../builder/champion.js';

/**
 * Modal de seleção de campeões (matriz)
 */
export function showChampionPickerModal(champions) {
    if (document.getElementById('champion-picker-modal')) {
        document.getElementById('champion-picker-modal').style.display = 'flex';
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'champion-picker-modal';
    modal.style = 'display:flex; position:fixed; z-index:9999; left:0; top:0; width:100vw; height:100vh; background:rgba(10,18,32,0.92); align-items:center; justify-content:center;';
    
    modal.innerHTML = `
      <div style="background:#151c2c; border-radius:1.2rem; padding:2.2rem 2.2rem 1.5rem 2.2rem; min-width:340px; max-width:98vw; max-height:98vh; box-shadow:0 8px 32px #000a; display:flex; flex-direction:column; gap:1.2rem; height:90vh;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem;">
          <h3 style="margin:0; font-size:1.25rem;">Selecionar Campeão</h3>
          <button id="close-champion-picker" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;"><i class='fas fa-times'></i></button>
        </div>
        <input id="champion-search-input" type="text" placeholder="Buscar campeão..." style="padding:0.6rem 1rem; border-radius:0.7rem; border:1px solid #233; background:#101624; color:#fff; font-size:1rem; outline:none; margin-bottom:0.7rem;" />
        <div id="champion-table-container" style="flex:1 1 0; min-height:0; height:100%;"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-champion-picker').onclick = () => {
        modal.style.display = 'none';
    };
    
    function renderChampionTable(filter = '') {
        const container = document.getElementById('champion-table-container');
        const sorted = [...champions].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        const filtered = filter ? sorted.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : sorted;
        
        if (!filtered.length) {
            container.innerHTML = '<div style="color:#aaa; text-align:center; padding:1.5rem;">Nenhum campeão encontrado</div>';
            return;
        }
        
        if (filtered.length === 1) {
            container.innerHTML = `<div style='display:flex;justify-content:center;align-items:flex-start;height:100%;padding-top:1.5rem;'>
                <button class="champion-table-btn" data-champ-id="${filtered[0].id}" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:0.5rem;padding:0.6rem 0.1rem;background:#1e263a;border-radius:0.8rem;border:1px solid #233;cursor:pointer;transition:.2s;outline:none;min-width:0;min-height:0;width:120px;overflow:hidden;box-sizing:border-box;">
                    <img src='${API_BASE}/${currentVersion}/img/champion/${filtered[0].image.full}' alt='${filtered[0].name}' style='width:44px;height:44px;border-radius:0.6rem;background:#222;object-fit:cover;box-shadow:0 2px 8px #0004;'>
                    <span style="color:#fff;font-size:${filtered[0].name.length > 12 ? '0.85rem' : '0.93rem'};font-weight:600;text-align:center;line-height:1.2;white-space:normal;word-break:break-word;max-width:90px;">${filtered[0].name}</span>
                </button>
            </div>`;
        } else {
            let colCount = 3;
            if (filtered.length === 2) colCount = 2;
            
            container.innerHTML = `<div style="display:grid; grid-template-columns:repeat(${colCount},1fr); gap:1.1rem 0.7rem; max-height:60vh; overflow-y:auto;">${filtered.map(champion => `
                <button class="champion-table-btn" data-champ-id="${champion.id}" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:0.5rem;padding:0.6rem 0.1rem;background:#1e263a;border-radius:0.8rem;border:1px solid #233;cursor:pointer;transition:.2s;outline:none;min-width:0;min-height:0;aspect-ratio:1/1;overflow:hidden;box-sizing:border-box;">
                    <img src='${API_BASE}/${currentVersion}/img/champion/${champion.image.full}' alt='${champion.name}' style='width:44px;height:44px;border-radius:0.6rem;background:#222;object-fit:cover;box-shadow:0 2px 8px #0004;'>
                    <span style="color:#fff;font-size:${champion.name.length > 12 ? '0.85rem' : '0.93rem'};font-weight:600;text-align:center;line-height:1.2;white-space:normal;word-break:break-word;max-width:90px;">${champion.name}</span>
                </button>
            `).join('')}</div>`;
        }
        
        container.querySelectorAll('.champion-table-btn').forEach(btn => {
            btn.onclick = () => {
                const champId = btn.getAttribute('data-champ-id');
                const select = document.getElementById('builder-champion-select');
                if (select) select.value = champId;
                modal.style.display = 'none';
                builderState.championId = champId;
                renderChampionSummary(champId);
            };
        });
    }
    
    document.getElementById('champion-search-input').oninput = (e) => {
        renderChampionTable(e.target.value);
    };
    
    renderChampionTable();
}

/**
 * Configurar botão de abertura da modal de seleção de campeão
 */
export function setupChampionModal() {
    const select = document.getElementById('builder-champion-select');
    if (!select) return;
    
    select.style.display = 'none';
    let openBtn = document.getElementById('open-champion-picker');
    
    if (!openBtn) {
        openBtn = document.createElement('button');
        openBtn.id = 'open-champion-picker';
        openBtn.className = 'builder-stats-tag';
        openBtn.type = 'button';
        openBtn.innerHTML = '<i class="fas fa-user-ninja"></i> Selecionar Campeão';
        select.parentNode.insertBefore(openBtn, select.nextSibling);
    }
    
    openBtn.onclick = () => showChampionPickerModal(allChampions);
}
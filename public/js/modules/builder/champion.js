/**
 * Funções relacionadas à renderização do campeão
 */
import { API_BASE, currentVersion, selectedChampionData, builderState } from '../config.js';
import { getChampionDetails } from '../api/datadragon.js';
import { calculateChampionStatsAtLevel, calculateItemStats, updateBuilderStats } from '../stats/stats.js';
import { updateChampionAbilities } from '../utils/abilities.js';

/**
 * Renderizar lista de campeões no select
 */
export function renderChampionSelect(champions) {
    const select = document.getElementById('builder-champion-select');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um campeão</option>';
    
    const sorted = [...champions].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    
    sorted.forEach(champion => {
        const option = document.createElement('option');
        option.value = champion.id;
        option.textContent = champion.name;
        select.appendChild(option);
    });
}

/**
 * Renderizar resumo do campeão selecionado
 */
export async function renderChampionSummary(championId) {
    const summaryEl = document.getElementById('builder-champion-summary');
    if (!summaryEl || !championId) {
        if (summaryEl) {
            summaryEl.innerHTML = '<div class="loading-state"><i class="fas fa-user-ninja"></i>Escolha um campeão para começar.</div>';
        }
        return;
    }

    try {
        summaryEl.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i>Carregando campeão...</div>';
        
        const championData = await getChampionDetails(currentVersion, championId);
        selectedChampionData = championData;
        
        const imageUrl = `${API_BASE}/${currentVersion}/img/champion/${championData.image.full}`;
        
        summaryEl.innerHTML = `
            <div class="builder-champion-card">
                <div class="builder-champion-portrait">
                    <img loading="lazy" src="${imageUrl}" alt="${championData.name}" onerror="this.onerror=null;this.src='public/images/logo-alttab.png';">
                </div>
                <div class="builder-champion-info">
                    <h3>${championData.name}</h3>
                    <p class="builder-champion-title">${championData.title}</p>
                    <div class="builder-champion-tags">
                        ${(championData.tags || []).map(tag => `<span class="data-badge">${tag}</span>`).join('')}
                    </div>
                    ${championData.partype ? `<p class="builder-champion-resource"><i class="fas fa-bolt"></i>${championData.partype}</p>` : ''}
                </div>
            </div>
            <p class="builder-champion-blurb">${championData.blurb || championData.lore?.substring(0, 200) + '...' || ''}</p>
        `;
        
        // Atualizar habilidades se o sistema existir
        updateChampionAbilities();
        updateBuilderStats();
        
    } catch (error) {
        console.error('Erro ao carregar campeão:', error);
        summaryEl.innerHTML = '<div class="builder-empty">Erro ao carregar campeão</div>';
    }
}
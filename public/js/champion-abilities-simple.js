/**
 * Sistema para carregar e exibir habilidades de campeões
 * Versão simplificada que remove os seletores de nível e calculadora de dano
 */

class ChampionAbilitiesManager {
    constructor() {
        this.championFullData = new Map();
        this.baseUrl = 'https://ddragon.leagueoflegends.com/cdn';
        this.currentVersion = '15.19.1';
        this.locale = 'pt_BR';
    }

    /**
     * Carrega dados completos de um campeão específico
     */
    async loadChampionFullData(championKey) {
        if (this.championFullData.has(championKey)) {
            return this.championFullData.get(championKey);
        }

        try {
            const url = `${this.baseUrl}/${this.currentVersion}/data/${this.locale}/champion/${championKey}.json`;
            const response = await fetch(url);
            const data = await response.json();
            
            const championData = data.data[championKey];
            this.championFullData.set(championKey, championData);
            
            return championData;
        } catch (error) {
            console.error(`Erro ao carregar dados completos de ${championKey}:`, error);
            return null;
        }
    }

    /**
     * Formata a descrição da habilidade substituindo placeholders
     */
    formatAbilityDescription(description) {
        if (!description) return 'Informações não disponíveis';
        
        // Substituir variáveis no formato {{ variableName }}
        return description.replace(/\{\{(.*?)\}\}/g, (match, variable) => {
            return '<span class="ability-value">' + variable + '</span>';
        });
    }

    /**
     * Renderiza todas as habilidades de um campeão
     */
    async renderChampionAbilities(championId, championStats, containerId = '#champion-abilities-container') {
        if (!championId) {
            const container = document.querySelector(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="abilities-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        Selecione um campeão para ver suas habilidades
                    </div>
                `;
            }
            return;
        }

        try {
            const container = document.querySelector(containerId);
            if (!container) return;
            
            container.innerHTML = '<div class="champion-abilities-loading"><i class="fas fa-spinner fa-spin"></i> Carregando habilidades...</div>';
            
            const championData = await this.loadChampionFullData(championId);
            if (!championData) {
                container.innerHTML = `
                    <div class="abilities-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        Erro ao carregar dados do campeão
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.buildAbilitiesHTML(championData);
            
        } catch (error) {
            console.error('Erro ao renderizar habilidades:', error);
            const container = document.querySelector(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="abilities-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        Erro ao carregar habilidades: ${error.message}
                    </div>
                `;
            }
        }
    }
    
    /**
     * Constrói HTML das habilidades
     */
    buildAbilitiesHTML(championData) {
        let html = '<div class="champion-abilities">';
        
        // Passiva
        if (championData.passive) {
            html += this.buildPassiveHTML(championData.passive);
        }

        // Habilidades Q, W, E, R
        if (championData.spells) {
            html += '<div class="champion-spells">';
            championData.spells.forEach((spell, index) => {
                const spellKey = ['Q', 'W', 'E', 'R'][index];
                
                // Aplicar dados de fallback se necessário
                if (window.applyAbilitiesFallback) {
                    spell = window.applyAbilitiesFallback(spell, index, championData.id);
                }
                
                html += this.buildSpellHTML(spell, spellKey);
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Constrói HTML da passiva
     */
    buildPassiveHTML(passive) {
        const imageUrl = `${this.baseUrl}/${this.currentVersion}/img/passive/${passive.image.full}`;
        const description = passive.description || 'Informações não disponíveis';
        
        return `
            <div class="ability-passive">
                <div class="ability-header">
                    <div class="ability-icon">
                        <img src="${imageUrl}" alt="${passive.name}" loading="lazy">
                        <span class="ability-key">P</span>
                    </div>
                    <div class="ability-info">
                        <h4 class="ability-name">${passive.name}</h4>
                        <p class="ability-description">${description}</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Constrói HTML de uma habilidade
     */
    buildSpellHTML(spell, spellKey) {
        const imageUrl = `${this.baseUrl}/${this.currentVersion}/img/spell/${spell.image.full}`;
        const description = this.formatAbilityDescription(spell.description || spell.tooltip || 'Informações não disponíveis');
        
        // Cooldown e custo
        const cooldown = spell.cooldownBurn || (spell.cooldown ? spell.cooldown.join('/') : 'N/A');
        const cost = spell.costBurn || (spell.cost ? spell.cost.join('/') : '0');
        const costType = spell.costType || spell.resource || 'Mana';
        
        // Obter alcance se disponível e relevante
        const range = spell.rangeBurn || (spell.range ? spell.range[0] : '');
        const showRange = range && range !== '25000' && range !== '';
        
        return `
            <div class="ability-spell" data-spell="${spellKey.toLowerCase()}">
                <div class="ability-header">
                    <div class="ability-icon">
                        <img src="${imageUrl}" alt="${spell.name}" loading="lazy" onerror="this.src='public/images/logo-alttab.png';">
                        <span class="ability-key">${spellKey}</span>
                    </div>
                    <div class="ability-info">
                        <div class="ability-title">
                            <h4 class="ability-name">${spell.name}</h4>
                        </div>
                        <div class="ability-stats">
                            ${cooldown !== 'N/A' ? `<span class="ability-cooldown"><i class="fas fa-clock"></i> ${cooldown}s</span>` : ''}
                            ${cost !== '0' ? `<span class="ability-cost"><i class="fas fa-tint"></i> ${cost} ${costType}</span>` : ''}
                            ${showRange ? `<span class="ability-range"><i class="fas fa-crosshairs"></i> ${range}</span>` : ''}
                        </div>
                        <p class="ability-description">${description}</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Instância global
window.championAbilitiesManager = new ChampionAbilitiesManager();

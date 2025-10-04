// Configurações globais do projeto
export const CONFIG = {
    // Data Dragon API oficial
    CDN_BASE: 'https://ddragon.leagueoflegends.com/cdn',
    VERSIONS_URL: 'https://ddragon.leagueoflegends.com/api/versions.json',
    
    // Configurações específicas - apenas PT-BR e Summoner's Rift
    TARGET_LOCALE: 'pt_BR',
    
    // Cache settings
    DATA_CACHE_KEY: 'alttab-lol-data-cache-v2',
    CACHE_TTL: 1000 * 60 * 60 * 24 * 7, // 7 dias
    
    // Usar apenas API externa (Data Dragon)
    USE_EXTERNAL_API_ONLY: true,
    
    // Configurações do Builder (apenas Summoner's Rift)
    MAX_BUILD_ITEMS: 6,
    BUILDER_ITEM_LIMIT: 18,
    
    // Filtros específicos para Summoner's Rift
    ALLOWED_MAPS: [11], // Apenas Summoner's Rift
    ALLOWED_GAME_MODES: ['CLASSIC'], // Apenas modo clássico
    
    // Itens a serem excluídos (não relevantes para Summoner's Rift)
    EXCLUDED_ITEM_TAGS: ['Consumable', 'Trinket'], // Configurável para filtrar itens
};

// Definições de estatísticas para o builder
export const BUILDER_STATS = [
    {
        id: 'hp',
        label: 'Vida',
        baseKey: 'hp',
        flatKeys: ['FlatHPPoolMod'],
        percentKeys: ['PercentHPPoolMod'],
        display: 'number',
        decimals: 0,
        mode: 'scaling',
        icon: 'fa-heart-pulse'
    },
    {
        id: 'attackdamage',
        label: 'Dano de Ataque',
        baseKey: 'attackdamage',
        flatKeys: ['FlatPhysicalDamageMod'],
        percentKeys: ['PercentPhysicalDamageMod'],
        display: 'number',
        decimals: 1,
        mode: 'scaling',
        icon: 'fa-crosshairs'
    },
    {
        id: 'abilitypower',
        label: 'Poder de Habilidade',
        base: () => 0,
        flatKeys: ['FlatMagicDamageMod'],
        percentKeys: ['PercentMagicDamageMod'],
        display: 'number',
        decimals: 1,
        mode: 'scaling',
        icon: 'fa-wand-magic-sparkles'
    },
    {
        id: 'armor',
        label: 'Armadura',
        baseKey: 'armor',
        flatKeys: ['FlatArmorMod'],
        percentKeys: ['PercentArmorMod'],
        display: 'number',
        decimals: 1,
        mode: 'scaling',
        icon: 'fa-shield-halved'
    },
    {
        id: 'mr',
        label: 'Resistência Mágica',
        baseKey: 'spellblock',
        flatKeys: ['FlatSpellBlockMod'],
        percentKeys: ['PercentSpellBlockMod'],
        display: 'number',
        decimals: 1,
        mode: 'scaling',
        icon: 'fa-shield'
    },
    {
        id: 'movespeed',
        label: 'Velocidade de Movimento',
        baseKey: 'movespeed',
        flatKeys: ['FlatMovementSpeedMod'],
        percentKeys: ['PercentMovementSpeedMod'],
        display: 'number',
        decimals: 0,
        mode: 'scaling',
        icon: 'fa-gauge-high'
    },
    {
        id: 'attackspeed',
        label: 'Velocidade de Ataque',
        base: (champion) => computeChampionBaseAttackSpeed(champion),
        flatKeys: ['FlatAttackSpeedMod'],
        percentKeys: ['PercentAttackSpeedMod'],
        display: 'attackSpeed',
        decimals: 3,
        mode: 'scaling',
        icon: 'fa-gauge-simple-high'
    },
    {
        id: 'crit',
        label: 'Chance de Crítico',
        baseKey: 'crit',
        flatKeys: ['FlatCritChanceMod'],
        percentKeys: ['PercentCritChanceMod'],
        display: 'percent',
        decimals: 1,
        mode: 'additive',
        icon: 'fa-bullseye'
    },
    {
        id: 'lifesteal',
        label: 'Roubo de Vida',
        base: () => 0,
        flatKeys: ['FlatLifeStealMod'],
        percentKeys: ['PercentLifeStealMod'],
        display: 'percent',
        decimals: 1,
        mode: 'additive',
        icon: 'fa-droplet'
    },
    {
        id: 'omnivamp',
        label: 'Onivampirismo',
        base: () => 0,
        flatKeys: ['FlatOmnivampMod'],
        percentKeys: ['PercentOmnivampMod'],
        display: 'percent',
        decimals: 1,
        mode: 'additive',
        icon: 'fa-circle-notch'
    }
];

// Função auxiliar para computar velocidade de ataque base
function computeChampionBaseAttackSpeed(champion) {
    if (!champion) {
        return 0.625;
    }

    const stats = champion.stats || {};
    if (typeof stats.attackspeed === 'number') {
        return stats.attackspeed;
    }

    const offset = Number(stats.attackspeedoffset || 0);
    const base = 0.625 / (1 + offset);
    return Number.isFinite(base) ? base : 0.625;
}
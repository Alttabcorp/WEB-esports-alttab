/**
 * Configurações e constantes globais
 */
export const API_BASE = 'https://ddragon.leagueoflegends.com/cdn';
export const LANG = 'pt_BR';
export let currentVersion = '15.19.1';

// Estado global do builder
export const builderState = {
    championId: null,
    items: [],
    maxItems: 6
};

// Dados globais de campeões e itens
export let allChampions = [];
export let allItems = [];
export let selectedChampionData = null;
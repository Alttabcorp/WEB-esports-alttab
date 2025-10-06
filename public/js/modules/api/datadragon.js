/**
 * Funções de API para Data Dragon
 */
import { API_BASE, LANG, currentVersion } from '../config.js';

/**
 * Obter versão mais recente do Data Dragon
 */
export async function getLatestVersion() {
    try {
        const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await res.json();
        return versions[0];
    } catch (error) {
        console.warn('Erro ao buscar versão mais recente, usando padrão:', currentVersion);
        return currentVersion;
    }
}

/**
 * Obter lista de campeões
 */
export async function getChampions(version) {
    const url = `${API_BASE}/${version}/data/${LANG}/champion.json`;
    const res = await fetch(url);
    const data = await res.json();
    return Object.values(data.data);
}

/**
 * Obter detalhes completos de um campeão
 */
export async function getChampionDetails(version, champId) {
    const url = `${API_BASE}/${version}/data/${LANG}/champion/${champId}.json`;
    const res = await fetch(url);
    const data = await res.json();
    return data.data[champId];
}

/**
 * Obter lista de itens
 */
export async function getItems(version) {
    const url = `${API_BASE}/${version}/data/${LANG}/item.json`;
    const res = await fetch(url);
    const data = await res.json();
    return Object.entries(data.data)
        .map(([id, item]) => ({ id: parseInt(id), ...item }))
        .filter(item => item.gold && item.gold.purchasable && item.image && item.maps && item.maps["11"]);
}
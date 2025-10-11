/**
 * Funções de utilitário para UI
 */
import { currentVersion } from '../config-new.js';

/**
 * Atualizar badges do hero
 */
export function updateHeroBadges(version, champions, items) {
    const patchBadge = document.getElementById('badge-patch');
    const championBadge = document.getElementById('badge-champions');
    const itemBadge = document.getElementById('badge-items');
    
    if (patchBadge) patchBadge.textContent = `Patch ${version}`;
    if (championBadge) championBadge.textContent = `${champions.length} campeões`;
    if (itemBadge) itemBadge.textContent = `${items.length} itens`;
}

/**
 * Verificar se estamos em tela de dispositivo móvel
 */
export function isMobile() {
    return window.innerWidth <= 900;
}
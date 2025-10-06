// Funções utilitárias para o projeto

export function escapeHtml(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function sanitizeUrlSegment(segment = '') {
    return segment.replace(/[^a-zA-Z0-9_.-]/g, '');
}

export function stripHtml(html = '') {
    return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export function formatGold(value) {
    if (typeof value !== 'number') {
        return '-';
    }
    return `${value.toLocaleString('pt-BR')} <i class="fas fa-coins"></i>`;
}

export function truncateText(text, maxLength) {
    if (!text) {
        return '';
    }
    const clean = text.trim();
    if (clean.length <= maxLength) {
        return clean;
    }
    return `${clean.slice(0, maxLength)}…`;
}

export function renderRating(value = 0) {
    const clamped = Math.max(0, Math.min(Number(value) || 0, 10));
    const filled = Math.round(clamped / 2);
    const total = 5;
    const stars = Array.from({ length: total }, (_, index) => index < filled ? '●' : '○').join(' ');
    return stars;
}

export function createErrorState(message) {
    return `<div class="error-state"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(message)}</div>`;
}

export function debounce(callback, delay = 200) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            callback.apply(null, args);
        }, delay);
    };
}
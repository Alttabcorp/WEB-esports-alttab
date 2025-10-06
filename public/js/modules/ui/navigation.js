// Funcionalidades gerais de navegação e UI
import { createErrorState } from '../utils/helpers.js';

export function setupNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = Array.from(document.querySelectorAll('.nav-link')).filter(link => link.getAttribute('href')?.startsWith('#'));
    const sections = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);

    const updateNavbar = () => {
        if (!navbar) {
            return;
        }
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    const highlightActive = () => {
        let currentSection = sections[0]?.id;

        sections.forEach(section => {
            const offsetTrigger = section.offsetTop - 160;
            if (window.scrollY >= offsetTrigger) {
                currentSection = section.id;
            }
        });

        navLinks.forEach(link => {
            const matches = link.getAttribute('href') === `#${currentSection}`;
            link.classList.toggle('active', matches);
        });
    };

    updateNavbar();
    highlightActive();

    window.addEventListener('scroll', () => {
        updateNavbar();
        highlightActive();
    });
}

export function setupMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (!navToggle || !navMenu) {
        return;
    }

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    document.addEventListener('click', (event) => {
        if (!navMenu.contains(event.target) && !navToggle.contains(event.target)) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

export function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (event) => {
            const targetSelector = link.getAttribute('href');
            const target = document.querySelector(targetSelector);

            if (!target) {
                return;
            }

            event.preventDefault();
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        });
    });
}

export function setupBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    if (!backToTopBtn) {
        return;
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

export function showGlobalDatasetError() {
    const championContainer = document.getElementById('champion-list');
    const itemContainer = document.getElementById('item-list');

    if (championContainer) {
        championContainer.innerHTML = createErrorState('Não foi possível carregar os campeões. Tente atualizar a página.');
    }

    if (itemContainer) {
        itemContainer.innerHTML = createErrorState('Não foi possível carregar os itens. Tente atualizar a página.');
    }
}

// Função createErrorState importada de helpers.js
// ================================
// ALTTAB ESPORTS - MAIN JAVASCRIPT
// ================================

document.addEventListener('DOMContentLoaded', function() {
    // Inicialização
    init();
});

function init() {
    // Loading Screen
    handleLoadingScreen();
    
    // Navigation
    setupNavigation();
    
    // Hero Animations
    setupHeroAnimations();
    
    // Scroll Animations
    setupScrollAnimations();
    
    // Form Handling
    setupContactForm();
    
    // Back to Top Button
    setupBackToTop();
    
    // Mobile Menu
    setupMobileMenu();
    
    // Counter Animation
    setupCounterAnimation();
    
    // Smooth Scrolling
    setupSmoothScrolling();
    
    // Player Card Interactions
    setupPlayerCardInteractions();
    
    // News Card Interactions
    setupNewsCardInteractions();
    
    // Match Card Interactions
    setupMatchCardInteractions();
}

// ================================
// LOADING SCREEN
// ================================
function handleLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    
    // Simula carregamento de recursos
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            // Inicia animações da página principal
            startPageAnimations();
        }, 500);
    }, 2000);
}

function startPageAnimations() {
    // Anima elementos do hero
    const heroElements = document.querySelectorAll('.hero-text > *, .hero-stats .stat-item');
    heroElements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('animate-fade-in-up');
        }, index * 200);
    });
}

// ================================
// NAVIGATION
// ================================
function setupNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Scroll effect para navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Active link baseado na seção visível
    const sections = document.querySelectorAll('section[id]');
    
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// ================================
// MOBILE MENU
// ================================
function setupMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Fecha menu ao clicar em um link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Fecha menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

// ================================
// HERO ANIMATIONS
// ================================
function setupHeroAnimations() {
    // Parallax effect para o hero background
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroVideo = document.querySelector('.hero-video');
        
        if (heroVideo) {
            const rate = scrolled * -0.5;
            heroVideo.style.transform = `translateY(${rate}px)`;
        }
    });
    
    // Typing effect para o título
    const titleMain = document.querySelector('.title-main');
    const titleSub = document.querySelector('.title-sub');
    
    if (titleMain && titleSub) {
        setTimeout(() => {
            animateTyping(titleMain, 'ALTTAB', 100);
            setTimeout(() => {
                animateTyping(titleSub, 'ESPORTS', 100);
            }, 800);
        }, 2500);
    }
}

function animateTyping(element, text, speed) {
    element.textContent = '';
    element.style.borderRight = '2px solid #3b82f6';
    
    let i = 0;
    const typeInterval = setInterval(() => {
        element.textContent += text.charAt(i);
        i++;
        
        if (i >= text.length) {
            clearInterval(typeInterval);
            setTimeout(() => {
                element.style.borderRight = 'none';
            }, 1000);
        }
    }, speed);
}

// ================================
// COUNTER ANIMATION
// ================================
function setupCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number');
    const animateCounters = () => {
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const current = parseInt(counter.textContent);
            const increment = target / 100;
            
            if (current < target) {
                counter.textContent = Math.ceil(current + increment);
                setTimeout(animateCounters, 50);
            } else {
                counter.textContent = target;
            }
        });
    };
    
    // Inicia animação quando a seção hero estiver visível
    const heroSection = document.getElementById('home');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(animateCounters, 3000);
                observer.unobserve(entry.target);
            }
        });
    });
    
    if (heroSection) {
        observer.observe(heroSection);
    }
}

// ================================
// SCROLL ANIMATIONS
// ================================
function setupScrollAnimations() {
    const animateElements = document.querySelectorAll('.player-card, .match-card, .achievement-card, .news-card, .contact-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animateElements.forEach(element => {
        observer.observe(element);
    });
}

// ================================
// SMOOTH SCROLLING
// ================================
function setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 70; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ================================
// BACK TO TOP BUTTON
// ================================
function setupBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    
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

// ================================
// PLAYER CARD INTERACTIONS
// ================================
function setupPlayerCardInteractions() {
    const playerCards = document.querySelectorAll('.player-card');
    
    playerCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Adiciona efeito de hover mais dinâmico
            card.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(-5px) scale(1)';
        });
        
        // Click effect para mostrar mais informações
        card.addEventListener('click', () => {
            showPlayerDetails(card);
        });
    });
}

function showPlayerDetails(playerCard) {
    const playerName = playerCard.querySelector('.player-name').textContent;
    const playerRealName = playerCard.querySelector('.player-real-name').textContent;
    
    // Simula abertura de modal com detalhes do jogador
    // Em uma implementação real, aqui abriria um modal com mais informações
    console.log(`Mostrando detalhes de: ${playerName} (${playerRealName})`);
    
    // Efeito visual temporário
    playerCard.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.5)';
    setTimeout(() => {
        playerCard.style.boxShadow = '';
    }, 1000);
}

// ================================
// NEWS CARD INTERACTIONS
// ================================
function setupNewsCardInteractions() {
    const newsCards = document.querySelectorAll('.news-card');
    
    newsCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const image = card.querySelector('.news-image img');
            if (image) {
                image.style.transform = 'scale(1.1)';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            const image = card.querySelector('.news-image img');
            if (image) {
                image.style.transform = 'scale(1.05)';
            }
        });
    });
}

// ================================
// MATCH CARD INTERACTIONS
// ================================
function setupMatchCardInteractions() {
    const matchCards = document.querySelectorAll('.match-card');
    
    matchCards.forEach(card => {
        card.addEventListener('click', () => {
            const isUpcoming = card.classList.contains('upcoming');
            const isCompleted = card.classList.contains('completed');
            
            if (isUpcoming) {
                showMatchPreview(card);
            } else if (isCompleted) {
                showMatchReplay(card);
            }
        });
    });
}

function showMatchPreview(matchCard) {
    // Simula abertura de preview da partida
    console.log('Abrindo preview da partida...');
    
    // Efeito visual
    matchCard.style.borderLeft = '4px solid #10b981';
    setTimeout(() => {
        matchCard.style.borderLeft = '4px solid #3b82f6';
    }, 1000);
}

function showMatchReplay(matchCard) {
    // Simula abertura do replay da partida
    console.log('Abrindo replay da partida...');
    
    // Efeito visual
    matchCard.style.transform = 'translateX(10px) scale(1.02)';
    setTimeout(() => {
        matchCard.style.transform = 'translateX(5px)';
    }, 300);
}

// ================================
// CONTACT FORM
// ================================
function setupContactForm() {
    const contactForm = document.querySelector('.contact-form');
    const subjectSelect = document.getElementById('subject');
    const positionGroup = document.getElementById('position-group');
    const rankGroup = document.getElementById('rank-group');
    
    // Lógica para mostrar campos específicos de tryout
    if (subjectSelect) {
        subjectSelect.addEventListener('change', function() {
            if (this.value === 'tryout') {
                positionGroup.style.display = 'block';
                rankGroup.style.display = 'block';
                document.getElementById('position').required = true;
                document.getElementById('rank').required = true;
            } else {
                positionGroup.style.display = 'none';
                rankGroup.style.display = 'none';
                document.getElementById('position').required = false;
                document.getElementById('rank').required = false;
            }
        });
    }
    
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmission(contactForm);
        });
        
        // Validação em tempo real
        const inputs = contactForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                validateField(input);
            });
            
            input.addEventListener('input', () => {
                clearFieldError(input);
            });
        });
    }
}

function handleFormSubmission(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Simula envio do formulário
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        // Simula resposta positiva
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Enviado!';
        submitBtn.style.background = 'var(--success-color)';
        
        // Reset form
        setTimeout(() => {
            form.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            submitBtn.style.background = '';
            
            // Esconde campos específicos de tryout
            const positionGroup = document.getElementById('position-group');
            const rankGroup = document.getElementById('rank-group');
            if (positionGroup) positionGroup.style.display = 'none';
            if (rankGroup) rankGroup.style.display = 'none';
            
            // Mensagem específica baseada no tipo de contato
            if (data.subject === 'tryout') {
                showSuccessMessage('Obrigado pelo interesse em jogar no ALTTAB Esports! Nossa equipe técnica analisará seu perfil e entrará em contato em até 48 horas. Boa sorte, invocador!');
            } else {
                showSuccessMessage('Obrigado pelo contato! Retornaremos em breve.');
            }
        }, 2000);
    }, 2000);
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    
    // Remove erro anterior
    clearFieldError(field);
    
    // Validações específicas
    switch (field.type) {
        case 'email':
            isValid = validateEmail(value);
            if (!isValid) {
                showFieldError(field, 'Email inválido');
            }
            break;
        case 'text':
            if (value.length < 2) {
                isValid = false;
                showFieldError(field, 'Muito curto');
            }
            break;
        default:
            if (field.hasAttribute('required') && !value) {
                isValid = false;
                showFieldError(field, 'Campo obrigatório');
            }
    }
    
    return isValid;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showFieldError(field, message) {
    field.style.borderColor = 'var(--danger-color)';
    
    let errorElement = field.parentElement.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.className = 'field-error';
        errorElement.style.color = 'var(--danger-color)';
        errorElement.style.fontSize = '0.8rem';
        errorElement.style.marginTop = '0.5rem';
        field.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

function clearFieldError(field) {
    field.style.borderColor = '';
    
    const errorElement = field.parentElement.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

function showSuccessMessage(message = 'Mensagem enviada com sucesso! Entraremos em contato em breve.') {
    // Cria notificação de sucesso
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    
    // Estilos da notificação
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'var(--success-color)',
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        boxShadow: 'var(--shadow-lg)',
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Anima entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove após 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// ================================
// UTILITY FUNCTIONS
// ================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ================================
// PERFORMANCE OPTIMIZATIONS
// ================================

// Debounce scroll events
window.addEventListener('scroll', debounce(() => {
    // Scroll optimizations can be added here
}, 10));

// Lazy loading para imagens
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Preload critical resources
function preloadResources() {
    const criticalImages = [
        'assets/images/logo-alttab.png',
        'assets/images/players/player-top.jpg',
        'assets/images/players/player-jungle.jpg',
        'assets/images/players/player-mid.jpg',
        'assets/images/players/player-adc.jpg',
        'assets/images/players/player-support.jpg'
    ];
    
    criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

// ================================
// ERROR HANDLING
// ================================
window.addEventListener('error', (e) => {
    console.error('Erro capturado:', e.error);
    // Em produção, enviar erro para serviço de monitoramento
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejeitada:', e.reason);
    // Em produção, enviar erro para serviço de monitoramento
});

// ================================
// KEYBOARD ACCESSIBILITY
// ================================
document.addEventListener('keydown', (e) => {
    // ESC para fechar modal/menu
    if (e.key === 'Escape') {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navMenu.classList.contains('active')) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        }
    }
});

// ================================
// ANALYTICS & TRACKING
// ================================
function trackEvent(category, action, label) {
    // Placeholder para tracking de eventos
    // Integrar com Google Analytics, Adobe Analytics, etc.
    console.log(`Event tracked: ${category} - ${action} - ${label}`);
}

// Track navigation clicks
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        trackEvent('Navigation', 'Click', link.textContent);
    });
});

// Track button clicks
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', () => {
        trackEvent('Button', 'Click', button.textContent);
    });
});

// ================================
// BROWSER COMPATIBILITY
// ================================
function checkBrowserSupport() {
    // Verifica suporte para features críticas
    const features = {
        intersectionObserver: 'IntersectionObserver' in window,
        cssGrid: CSS.supports('display', 'grid'),
        flexbox: CSS.supports('display', 'flex'),
        customProperties: CSS.supports('--custom', 'property')
    };
    
    const unsupportedFeatures = Object.entries(features)
        .filter(([feature, supported]) => !supported)
        .map(([feature]) => feature);
    
    if (unsupportedFeatures.length > 0) {
        console.warn('Features não suportadas:', unsupportedFeatures);
        // Implementar fallbacks se necessário
    }
}

// Executa verificação de compatibilidade
checkBrowserSupport();

// ================================
// THEME TOGGLE (Bonus Feature)
// ================================
function setupThemeToggle() {
    const themeToggle = document.createElement('button');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.className = 'theme-toggle';
    themeToggle.style.cssText = `
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        width: 50px;
        height: 50px;
        border: none;
        border-radius: 50%;
        background: var(--accent-color);
        color: white;
        cursor: pointer;
        z-index: 1001;
        transition: all 0.3s ease;
        display: none; /* Hidden by default */
    `;
    
    document.body.appendChild(themeToggle);
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const icon = themeToggle.querySelector('i');
        
        if (document.body.classList.contains('light-theme')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    });
}

// Inicializa tema toggle (comentado por padrão)
// setupThemeToggle();

console.log('🎮 ALTTAB Esports Website Loaded Successfully!');
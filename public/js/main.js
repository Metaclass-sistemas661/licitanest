/* ========================================================================
   LICITANEST LANDING PAGE — Main JavaScript (Premium Edition)
   Modularizado + Animações GSAP Cinematográficas
   ======================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // 1. HAMBURGER MOBILE MENU
    // ===================================================================
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');
    if (hamburgerBtn && mobileOverlay) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            mobileOverlay.classList.toggle('open');
            document.body.style.overflow = mobileOverlay.classList.contains('open') ? 'hidden' : '';
        });
        mobileOverlay.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburgerBtn.classList.remove('active');
                mobileOverlay.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // ===================================================================
    // 2. LENIS SMOOTH SCROLL + GSAP INTEGRATION
    // ===================================================================
    let lenis;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.4,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 0.8,
            touchMultiplier: 1.5,
        });

        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => { lenis.raf(time * 1000); });
            gsap.ticker.lagSmoothing(0);
        } else {
            function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
            requestAnimationFrame(raf);
        }
    }

    // ===================================================================
    // 3. GSAP PREMIUM ANIMATION ENGINE
    // ===================================================================
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // ─── 3a. HERO CINEMATIC ENTRANCE ──────────────────
        const heroTL = gsap.timeline({ delay: 0.3 });

        // Badge floats in
        heroTL.fromTo('.hero-badge',
            { y: 40, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: 'power4.out' }
        );

        // Title — word-by-word reveal
        const titleEl = document.querySelector('.hero-title');
        if (titleEl) {
            const childNodes = Array.from(titleEl.childNodes);
            let newHTML = '';
            childNodes.forEach(node => {
                if (node.nodeType === 3) {
                    const words = node.textContent.split(/(\s+)/);
                    words.forEach(w => {
                        if (w.trim() === '') { newHTML += w; }
                        else { newHTML += '<span class="split-word"><span class="split-word-inner">' + w + '</span></span>'; }
                    });
                } else if (node.nodeType === 1) {
                    newHTML += '<span class="split-word"><span class="split-word-inner">' + node.outerHTML + '</span></span>';
                }
            });
            titleEl.innerHTML = newHTML;
            titleEl.style.opacity = '1';
            titleEl.style.transform = 'none';
            titleEl.style.animation = 'none';

            heroTL.fromTo('.hero-title .split-word-inner',
                { y: '110%', rotateX: -40 },
                { y: '0%', rotateX: 0, duration: 1.4, stagger: 0.12, ease: 'power4.out' },
                '-=0.7'
            );
        }

        // Subtitle slides up with blur
        heroTL.fromTo('.hero-sub-anim',
            { y: 50, opacity: 0, filter: 'blur(8px)' },
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, ease: 'power3.out' },
            '-=1.0'
        );

        // CTA buttons stagger in
        heroTL.fromTo('.hero-cta-anim .btn',
            { y: 30, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 1.0, stagger: 0.15, ease: 'power3.out' },
            '-=1.0'
        );

        // Hero video slow zoom
        gsap.fromTo('.hero-bg-map',
            { scale: 1.2 },
            { scale: 1.05, duration: 2.5, ease: 'power2.out', delay: 0.2 }
        );

        // ─── 3b. HERO PARALLAX ON SCROLL ──────────────────
        gsap.to('.hero-content', {
            y: -100, opacity: 0.3, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
        });
        gsap.to('.hero-bg-map', {
            y: 80, scale: 1.15, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
        });

        // ─── 3c. SECTION REVEAL SYSTEM ────────────────────
        gsap.utils.toArray('.section-reveal').forEach(section => {
            gsap.fromTo(section,
                { opacity: 0, y: 100, scale: 0.97 },
                {
                    opacity: 1, y: 0, scale: 1,
                    duration: 1.6, ease: 'power3.out',
                    scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 40%', toggleActions: 'play none none reverse' }
                }
            );
        });

        // ─── 3d. CLEAN FEATURES (Imagem + Texto) ──────────
        gsap.fromTo('.cf-image-render',
            { y: 200, rotation: -3, scale: 0.9, opacity: 0 },
            {
                y: -60, rotation: 0, scale: 1, opacity: 1, ease: 'none',
                scrollTrigger: { trigger: '.clean-features', start: 'top bottom', end: 'bottom top', scrub: 1.5 }
            }
        );
        gsap.fromTo('.clean-features-text > *',
            { y: 70, opacity: 0, filter: 'blur(4px)' },
            {
                y: 0, opacity: 1, filter: 'blur(0px)',
                duration: 1.4, stagger: 0.25, ease: 'power3.out',
                scrollTrigger: { trigger: '.clean-features', start: 'top 65%', toggleActions: 'play none none reverse' }
            }
        );
        gsap.to('.cf-image-render', {
            y: '+=12', rotation: '-=0.5',
            duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut'
        });

        // ─── 3e. PROCESS STEPS ────────────────────────────
        gsap.fromTo('.process-header-left h2',
            { y: 60, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out',
              scrollTrigger: { trigger: '.process-section', start: 'top 70%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.process-header-right',
            { y: 40, opacity: 0, filter: 'blur(6px)' },
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, ease: 'power3.out', delay: 0.2,
              scrollTrigger: { trigger: '.process-section', start: 'top 70%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.process-step',
            { y: 80, opacity: 0, rotateY: -8, scale: 0.95 },
            { y: 0, opacity: 1, rotateY: 0, scale: 1, duration: 1.2, stagger: 0.2, ease: 'power3.out',
              scrollTrigger: { trigger: '.process-steps', start: 'top 80%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3f. FEATURES GRID ────────────────────────────
        gsap.fromTo('.features-section-title',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out',
              scrollTrigger: { trigger: '.features-section', start: 'top 75%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.feature-item',
            { y: 70, opacity: 0, scale: 0.94 },
            { y: 0, opacity: 1, scale: 1, duration: 1.0, stagger: { each: 0.12, from: 'start' }, ease: 'power3.out',
              scrollTrigger: { trigger: '.features-grid', start: 'top 80%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3g. TESTIMONIALS ─────────────────────────────
        gsap.fromTo('.testimonials-header',
            { y: 60, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out',
              scrollTrigger: { trigger: '.testimonials-section', start: 'top 70%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3h. NATIONAL MAP ─────────────────────────────
        gsap.fromTo('.map-content-left',
            { x: -80, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.4, ease: 'power3.out',
              scrollTrigger: { trigger: '.map-content-left', start: 'top 80%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.interactive-map-container',
            { x: 80, opacity: 0, scale: 0.92 },
            { x: 0, opacity: 1, scale: 1, duration: 1.6, ease: 'power3.out',
              scrollTrigger: { trigger: '.interactive-map-container', start: 'top 80%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.map-pin',
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(2)',
              scrollTrigger: { trigger: '.interactive-map-container', start: 'top 75%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.map-stat-item',
            { y: 40, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.15, ease: 'back.out(1.5)',
              scrollTrigger: { trigger: '.map-stats-grid', start: 'top 85%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3i. COMPLIANCE CARDS ─────────────────────────
        gsap.fromTo('.compliance-card',
            { y: 80, opacity: 0, rotateX: -10 },
            { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.2, ease: 'power3.out',
              scrollTrigger: { trigger: '.compliance-container', start: 'top 80%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3j. TOOLKIT CARDS ────────────────────────────
        gsap.fromTo('.toolkit-header h2',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out',
              scrollTrigger: { trigger: '.toolkit-section', start: 'top 75%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.toolkit-card',
            { y: 60, opacity: 0, scale: 0.93 },
            { y: 0, opacity: 1, scale: 1, duration: 1.0,
              stagger: { each: 0.1, grid: [2, 4], from: 'start' }, ease: 'power3.out',
              scrollTrigger: { trigger: '.toolkit-grid', start: 'top 80%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3k. CTA SPLIT ───────────────────────────────
        gsap.fromTo('.cta-visual',
            { x: -100, opacity: 0, scale: 0.9 },
            { x: 0, opacity: 1, scale: 1, duration: 1.6, ease: 'power3.out',
              scrollTrigger: { trigger: '.cta-split', start: 'top 75%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.cta-content',
            { x: 100, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.6, ease: 'power3.out',
              scrollTrigger: { trigger: '.cta-split', start: 'top 75%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3l. LEAD CAPTURE ─────────────────────────────
        const leadSection = document.querySelector('.lead-capture-section');
        if (leadSection) {
            gsap.fromTo('.lead-capture-container',
                { y: 60, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out',
                  scrollTrigger: { trigger: leadSection, start: 'top 80%', toggleActions: 'play none none reverse' } }
            );
        }

        // ─── 3m. FAQ SECTION ──────────────────────────────
        gsap.fromTo('.faq-header-top',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out',
              scrollTrigger: { trigger: '.faq-section', start: 'top 75%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.faq-item',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out',
              scrollTrigger: { trigger: '.faq-grid-layout', start: 'top 80%', toggleActions: 'play none none reverse' } }
        );
        gsap.fromTo('.faq-sidebar',
            { x: 60, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.2, ease: 'power3.out',
              scrollTrigger: { trigger: '.faq-grid-layout', start: 'top 75%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3n. BOTTOM SECTION (Calculator + Footer) ────
        gsap.fromTo('.bottom-unified-section',
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 1.6, ease: 'power3.out',
              scrollTrigger: { trigger: '.bottom-unified-section', start: 'top 85%', toggleActions: 'play none none reverse' } }
        );

        // ─── 3o. MAGNETIC HOVER EFFECT ────────────────────
        document.querySelectorAll('.magnetic-wrap').forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: 'power2.out' });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
            });
        });

        // ─── 3p. TILT 3D HOVER (Cards) ───────────────────
        document.querySelectorAll('.process-step, .toolkit-card').forEach(card => {
            card.style.transition = 'none';
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                gsap.to(card, {
                    rotateY: x * 10, rotateX: -y * 10, scale: 1.03,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    duration: 0.4, ease: 'power2.out', transformPerspective: 800
                });
            });
            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    rotateY: 0, rotateX: 0, scale: 1,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    duration: 0.8, ease: 'elastic.out(1, 0.6)'
                });
            });
        });

        // ─── 3q. PARALLAX FLOATING ELEMENTS ──────────────
        gsap.utils.toArray('.process-step-number').forEach((num, i) => {
            gsap.to(num, {
                y: -30 - (i * 10), ease: 'none',
                scrollTrigger: { trigger: num, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
            });
        });
        gsap.to('.integrations-track', {
            x: '-5%', ease: 'none',
            scrollTrigger: { trigger: '.integrations-banner', start: 'top bottom', end: 'bottom top', scrub: 2 }
        });

        // ─── 3r. COUNTER ANIMATION (Calculator) ──────────
        const resNum = document.getElementById('res-number');
        if (resNum) {
            ScrollTrigger.create({
                trigger: '.bottom-unified-section',
                start: 'top 80%',
                onEnter: () => {
                    gsap.fromTo(resNum,
                        { scale: 0.5, opacity: 0 },
                        { scale: 1, opacity: 1, duration: 1.2, ease: 'elastic.out(1, 0.5)' }
                    );
                },
                once: true
            });
        }

        // ─── 3s. SMOOTH HEADER SHOW/HIDE ─────────────────
        const header = document.querySelector('.main-header');
        if (header) {
            ScrollTrigger.create({
                start: 'top -100',
                onUpdate: (self) => {
                    if (self.direction === -1) {
                        gsap.to(header, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
                    } else if (self.scroll() > 300) {
                        gsap.to(header, { y: -120, opacity: 0, duration: 0.5, ease: 'power3.in' });
                    }
                }
            });
        }

        // ─── 3t. SCROLL PROGRESS BAR (GSAP-powered) ─────
        const progressBar = document.querySelector('.scroll-progress-bar');
        if (progressBar) {
            gsap.to(progressBar, {
                scaleX: 1, ease: 'none',
                scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
            });
        }

        // ─── 3u. ACTIVE NAV HIGHLIGHTING ─────────────────
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.main-nav a');
        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                if (window.pageYOffset >= (section.offsetTop - 150)) {
                    current = section.getAttribute('id');
                }
            });
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        }, { passive: true });

        // ─── 3v. SMOOTH ANCHOR NAVIGATION ────────────────
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href && href.length > 1) {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        if (lenis) {
                            lenis.scrollTo(target, { offset: -100, duration: 2.0 });
                        } else {
                            target.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                }
            });
        });

    } // end GSAP block

    // ===================================================================
    // 4. CALCULATOR LOGIC
    // ===================================================================
    const calcState = {
        profile: 'small',
        baskets: 10,
        withOcr: false,
        withMonitoring: false,
        showBrl: false
    };

    const profiles = {
        small:    { label: 'Pequeno Porte', hourlyRate: 35, hoursPerBasket: 8,  errorRate: 0.12 },
        medium:   { label: 'Médio Porte',   hourlyRate: 50, hoursPerBasket: 12, errorRate: 0.18 },
        large:    { label: 'Grande Porte',   hourlyRate: 70, hoursPerBasket: 18, errorRate: 0.25 },
        tribunal: { label: 'Tribunal / TCE', hourlyRate: 90, hoursPerBasket: 22, errorRate: 0.30 }
    };

    window.setProfile = function(key) {
        calcState.profile = key;
        document.querySelectorAll('.calc-option-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.profile === key);
        });
        updateCalc();
    };

    window.toggleUnit = function() {
        calcState.showBrl = !calcState.showBrl;
        const toggle = document.querySelector('.unit-toggle');
        if (toggle) toggle.classList.toggle('is-brl', calcState.showBrl);
        updateCalc();
    };

    function updateCalc() {
        const p = profiles[calcState.profile];
        if (!p) return;

        const baskets = calcState.baskets;
        const manualHours = baskets * p.hoursPerBasket;
        const autoHours = Math.round(manualHours * 0.15);
        const savedHours = manualHours - autoHours;

        const manualCost = manualHours * p.hourlyRate;
        const autoCost   = autoHours * p.hourlyRate;
        const savedCost  = manualCost - autoCost;

        const reworkCost    = Math.round(manualCost * p.errorRate);
        const ocrSaving     = calcState.withOcr ? Math.round(baskets * 2.5 * p.hourlyRate) : 0;
        const monitorSaving = calcState.withMonitoring ? Math.round(baskets * 1.5 * p.hourlyRate) : 0;
        const totalSaved    = savedCost + reworkCost + ocrSaving + monitorSaving;

        const prefix = document.getElementById('res-prefix');
        const number = document.getElementById('res-number');
        const suffix = document.getElementById('res-suffix');

        if (calcState.showBrl) {
            if (prefix) prefix.textContent = 'R$';
            if (number) number.textContent = totalSaved.toLocaleString('pt-BR');
            if (suffix) suffix.textContent = '/mês';
        } else {
            if (prefix) prefix.textContent = '';
            if (number) number.textContent = savedHours;
            if (suffix) suffix.textContent = 'horas/mês';
        }

        const elManual = document.getElementById('bd-manual');
        const elAuto   = document.getElementById('bd-auto');
        const elRework = document.getElementById('bd-rework');
        const elTotal  = document.getElementById('bd-total');

        if (elManual) elManual.textContent = calcState.showBrl ? 'R$ ' + manualCost.toLocaleString('pt-BR') : manualHours + 'h';
        if (elAuto)   elAuto.textContent   = calcState.showBrl ? 'R$ ' + autoCost.toLocaleString('pt-BR')   : autoHours + 'h';
        if (elRework) elRework.textContent = calcState.showBrl ? 'R$ ' + reworkCost.toLocaleString('pt-BR') : Math.round(manualHours * p.errorRate) + 'h';
        if (elTotal)  elTotal.textContent  = calcState.showBrl ? 'R$ ' + totalSaved.toLocaleString('pt-BR') : savedHours + 'h';

        const sliderVal = document.getElementById('slider-val');
        if (sliderVal) sliderVal.textContent = baskets + ' cestas';
    }

    const rangeSlider = document.getElementById('calc-range');
    if (rangeSlider) {
        rangeSlider.addEventListener('input', e => {
            calcState.baskets = parseInt(e.target.value, 10);
            updateCalc();
        });
    }

    const toggleOcr = document.getElementById('toggle-ocr');
    if (toggleOcr) {
        toggleOcr.addEventListener('change', e => { calcState.withOcr = e.target.checked; updateCalc(); });
    }

    const toggleMon = document.getElementById('toggle-monitoring');
    if (toggleMon) {
        toggleMon.addEventListener('change', e => { calcState.withMonitoring = e.target.checked; updateCalc(); });
    }

    updateCalc();

    // ===================================================================
    // 5. COOKIE BANNER
    // ===================================================================
    const cookieBanner = document.getElementById('cookie-banner');
    if (cookieBanner && !localStorage.getItem('licitanest_cookies_accepted')) {
        setTimeout(() => cookieBanner.classList.add('show'), 2000);
    }

    window.acceptCookies = function() {
        localStorage.setItem('licitanest_cookies_accepted', 'true');
        if (cookieBanner) cookieBanner.classList.remove('show');
    };
    window.rejectCookies = function() {
        localStorage.setItem('licitanest_cookies_accepted', 'essential');
        if (cookieBanner) cookieBanner.classList.remove('show');
    };
    window.closeCookieBanner = function() {
        if (cookieBanner) cookieBanner.classList.remove('show');
    };

    // ===================================================================
    // 6. EXIT INTENT POPUP
    // ===================================================================
    let exitShown = false;
    const exitOverlay = document.getElementById('exit-popup-overlay');

    function showExitPopup() {
        if (exitShown || !exitOverlay) return;
        if (sessionStorage.getItem('licitanest_exit_shown')) return;
        exitShown = true;
        sessionStorage.setItem('licitanest_exit_shown', 'true');
        exitOverlay.classList.add('show');
    }

    document.addEventListener('mouseout', e => {
        if (e.clientY <= 0) showExitPopup();
    });

    window.closeExitPopup = function() {
        if (exitOverlay) exitOverlay.classList.remove('show');
    };

    if (exitOverlay) {
        exitOverlay.addEventListener('click', e => {
            if (e.target === exitOverlay) window.closeExitPopup();
        });
    }

    // ===================================================================
    // 7. LEAD FORM HANDLING
    // ===================================================================
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', e => {
            e.preventDefault();
            const formData = new FormData(leadForm);
            const data = Object.fromEntries(formData.entries());
            console.log('Lead capturado:', data);
            const btn = leadForm.querySelector('.lead-form-btn');
            if (btn) {
                btn.textContent = 'Enviado com sucesso!';
                btn.style.background = '#22c55e';
                setTimeout(() => {
                    btn.innerHTML = 'Solicitar Acesso <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
                    btn.style.background = '';
                }, 3000);
            }
            leadForm.reset();
        });
    }

    const exitForm = document.getElementById('exit-popup-form');
    if (exitForm) {
        exitForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = exitForm.querySelector('input').value;
            console.log('Exit lead:', email);
            window.closeExitPopup();
        });
    }

    // ===================================================================
    // 8. LUCIDE ICONS INITIALIZATION
    // ===================================================================
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

});

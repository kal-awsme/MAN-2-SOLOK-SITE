/**
 * MAN 2 SOLOK — Shared JavaScript System
 * "Quiet Premium Motion"
 *
 * One system. All 7 pages. Vanilla JS.
 * Mobile-first. Accessible. Performant.
 *
 * Features:
 * - Loading screen control with premium exit
 * - Subtle page entrance animation
 * - Scroll reveal with IntersectionObserver
 * - Internal page fade-out transitions
 * - Fullscreen menu with scroll lock
 * - Floating social buttons with ambient motion
 * - Reduced motion accessibility
 *
 * © 2026 MAN 2 Solok | Designed & Developed by Haikal Ashidiq
 */

(function () {
    'use strict';

    // ============================================================
    // 1. CONFIGURATION
    // ============================================================

    const CONFIG = {
        // Loading
        MIN_LOADING_TIME: 2200, // milliseconds
        LOADING_FALLBACK: 5000, // CSS fallback (same as CSS animation-delay)
        LOADING_EXIT_DURATION: 700, // matches CSS

        // Page entrance
        ENTRANCE_DURATION: 600,
        ENTRANCE_DELAY: 100,

        // Scroll reveal
        REVEAL_THRESHOLD: 0.12,
        REVEAL_STAGGER: 80,
        REVEAL_DURATION: 700,

        // Internal transition
        TRANSITION_DURATION: 320,

        // Floating buttons
        FLOATING_DRIFT: 4,
        FLOATING_INTERVAL: 3000,
    };

    // ============================================================
    // 2. UTILITY HELPERS
    // ============================================================

    const utils = {
        /** Safely query a single element */
        qs: (selector, context = document) => context.querySelector(selector),

        /** Safely query multiple elements */
        qsa: (selector, context = document) => [...context.querySelectorAll(selector)],

        /** Check if an element exists */
        exists: (selector, context = document) => !!context.querySelector(selector),

        /** Check if reduced motion is preferred */
        prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,

        /** Check if a link is internal (same origin, .html or root) */
        isInternalLink: (link) => {
            if (!link || !link.href) return false;

            // External protocol check
            if (link.protocol && !['http:', 'https:'].includes(link.protocol)) return false;

            // Same origin check
            if (link.origin !== window.location.origin) return false;

            // Check if it's a .html link or root
            const path = link.pathname;
            return path.endsWith('.html') || path === '/' || path === '';
        },

        /** Check if a link should be intercepted (internal, not target="_blank", not modified) */
        shouldIntercept: (event, link) => {
            if (!link || !link.href) return false;
            if (link.target === '_blank') return false;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
            if (event.button !== 0) return false;
            if (link.hasAttribute('download')) return false;
            if (link.protocol && !['http:', 'https:'].includes(link.protocol)) return false;
            return utils.isInternalLink(link);
        },

        /** Debounce helper for scroll/resize */
        debounce: (fn, delay) => {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => fn(...args), delay);
            };
        },

        /** Throttle helper */
        throttle: (fn, limit) => {
            let inThrottle = false;
            return (...args) => {
                if (!inThrottle) {
                    fn(...args);
                    inThrottle = true;
                    setTimeout(() => (inThrottle = false), limit);
                }
            };
        },
    };

    // ============================================================
    // 3. LOADING SYSTEM
    // ============================================================

    const LoadingSystem = {
        screen: null,
        startTime: 0,
        isReady: false,
        isExiting: false,
        isExited: false,
        exitTimer: null,

        /** Initialize the loading system */
        init() {
            this.screen = document.getElementById('loading-screen');
            if (!this.screen) return;

            this.startTime = Date.now();

            // Wait for DOM + images to be ready
            if (document.readyState === 'complete') {
                this.onContentReady();
            } else {
                window.addEventListener('load', () => this.onContentReady());
                // Also listen for DOMContentLoaded as a backup
                document.addEventListener('DOMContentLoaded', () => {
                    // If load hasn't fired yet, but DOM is ready, start checking
                    if (!this.isReady) {
                        // Wait a bit more for images
                        setTimeout(() => {
                            if (!this.isReady) this.onContentReady();
                        }, 800);
                    }
                });
            }

            // Fallback: if everything fails, CSS will handle exit at 5s
        },

        /** Called when page content is ready */
        onContentReady() {
            if (this.isReady || this.isExiting) return;
            this.isReady = true;

            const elapsed = Date.now() - this.startTime;
            const remaining = Math.max(0, CONFIG.MIN_LOADING_TIME - elapsed);

            // Wait for minimum display time, then exit
            clearTimeout(this.exitTimer);
            this.exitTimer = setTimeout(() => this.exit(), remaining);
        },

        /** Trigger the loading screen exit */
        exit() {
            if (this.isExiting || this.isExited) return;
            if (!this.screen) return;

            this.isExiting = true;

            // Override the CSS animation-delay to exit immediately
            // The CSS has animation-delay: 5s as fallback
            this.screen.style.animationDelay = '0s';
            this.screen.style.animation = 'loading-screen-exit 700ms ease forwards';

            // Also ensure the progress bar is complete
            const fill = this.screen.querySelector('.loading-progress-fill');
            if (fill) {
                fill.style.width = '100%';
            }

            // Remove from DOM after animation completes
            setTimeout(() => {
                this.hide();
            }, CONFIG.LOADING_EXIT_DURATION + 50);
        },

        /** Hide the loading screen completely */
        hide() {
            if (this.isExited) return;
            this.isExited = true;

            if (this.screen && this.screen.parentNode) {
                // Remove from DOM
                this.screen.parentNode.removeChild(this.screen);
            }

            // Clean up
            clearTimeout(this.exitTimer);

            // Dispatch event that loading is complete
            document.dispatchEvent(new CustomEvent('man-loading-complete'));

            // Trigger page entrance after a tiny delay
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    PageEntrance.enter();
                });
            });
        },

        /** Check if loading is complete (for external use) */
        isComplete() {
            return this.isExited;
        },
    };

    // ============================================================
    // 4. PAGE ENTRANCE
    // ============================================================

    const PageEntrance = {
        isEntered: false,
        mainContent: null,

        /** Trigger the page entrance animation */
        enter() {
            if (this.isEntered) return;
            if (utils.prefersReducedMotion()) {
                this.isEntered = true;
                document.body.classList.add('man-entered');
                return;
            }

            this.mainContent = document.getElementById('konten-utama');
            if (!this.mainContent) {
                this.isEntered = true;
                document.body.classList.add('man-entered');
                return;
            }

            // Apply a subtle entrance using Web Animations API
            // Start from slightly lower position, rise into place
            // No opacity change to avoid flashing

            try {
                const animation = this.mainContent.animate(
                    [
                        { transform: 'translateY(10px)', opacity: 0.96 },
                        { transform: 'translateY(0)', opacity: 1 },
                    ],
                    {
                        duration: CONFIG.ENTRANCE_DURATION,
                        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        fill: 'forwards',
                        delay: CONFIG.ENTRANCE_DELAY,
                    }
                );

                animation.onfinish = () => {
                    this.isEntered = true;
                    document.body.classList.add('man-entered');
                    // Clean up inline styles
                    if (this.mainContent) {
                        this.mainContent.style.transform = '';
                        this.mainContent.style.opacity = '';
                    }
                };

                // Fallback: if animation fails, mark as entered
                setTimeout(() => {
                    if (!this.isEntered) {
                        this.isEntered = true;
                        document.body.classList.add('man-entered');
                        if (this.mainContent) {
                            this.mainContent.style.transform = '';
                            this.mainContent.style.opacity = '';
                        }
                    }
                }, CONFIG.ENTRANCE_DURATION + CONFIG.ENTRANCE_DELAY + 200);
            } catch (_) {
                // Fallback for older browsers
                this.isEntered = true;
                document.body.classList.add('man-entered');
            }
        },
    };

    // ============================================================
    // 5. SCROLL REVEAL SYSTEM
    // ============================================================

    const ScrollReveal = {
        observer: null,
        revealedElements: new Set(),
        isActive: true,

        /** Selectors for elements to reveal */
        getSelectors() {
            return [
                '.section-heading',
                '.highlight-card',
                '.jurusan-card',
                '.fasilitas-card',
                '.dokumentasi-item',
                '.dokumentasi-photo',
                '.artikel-card',
                '.history-item',
                '.indikator-card',
                '.misi-item',
                '.speech-card',
                '.organisasi-card',
                '.vision-statement-card',
                '.about-text',
                '.jurusan-preview .jurusan-card',
                '.artikel-preview .artikel-card',
                '.dokumentasi-preview .dokumentasi-item',
                '.jurusan-list-section .jurusan-card',
                '.fasilitas-list-section .fasilitas-card',
                '.artikel-list-section .artikel-card',
                '.dokumentasi-category .dokumentasi-photo',
                '.kontak-item',
            ];
        },

        /** Initialize the scroll reveal system */
        init() {
            if (utils.prefersReducedMotion()) {
                this.isActive = false;
                return;
            }

            // Wait for page entrance to complete
            const startObserver = () => {
                if (!document.body.classList.contains('man-entered')) {
                    requestAnimationFrame(startObserver);
                    return;
                }
                this.setupObserver();
            };

            // If loading is already complete, start after entrance
            if (document.body.classList.contains('man-entered')) {
                this.setupObserver();
            } else {
                document.addEventListener('man-loading-complete', () => {
                    // Wait a bit for entrance
                    setTimeout(() => this.setupObserver(), 300);
                });
                // Fallback: if event doesn't fire
                setTimeout(() => {
                    if (!this.observer) {
                        this.setupObserver();
                    }
                }, 4000);
            }
        },

        /** Set up the IntersectionObserver */
        setupObserver() {
            if (this.observer) return;
            if (!this.isActive) return;

            const selectors = this.getSelectors();
            const elements = [];

            for (const selector of selectors) {
                const found = utils.qsa(selector);
                for (const el of found) {
                    // Skip elements that are already revealed
                    if (this.revealedElements.has(el)) continue;
                    // Skip elements that are in the viewport already (they'll be revealed immediately)
                    elements.push(el);
                }
            }

            if (elements.length === 0) return;

            this.observer = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            this.revealElement(entry.target);
                        }
                    }
                },
                {
                    threshold: CONFIG.REVEAL_THRESHOLD,
                    rootMargin: '0px 0px -30px 0px',
                }
            );

            // Add elements to observer
            for (const el of elements) {
                this.observer.observe(el);
            }

            // Also handle elements that are already visible
            // Some elements might be in the viewport at init time
            // Use a small delay to let the page settle
            setTimeout(() => {
                for (const el of elements) {
                    if (!this.revealedElements.has(el)) {
                        const rect = el.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        if (rect.top < viewportHeight * 0.85) {
                            this.revealElement(el);
                        }
                    }
                }
            }, 200);
        },

        /** Reveal a single element with stagger support */
        revealElement(element) {
            if (!element || this.revealedElements.has(element)) return;
            if (utils.prefersReducedMotion()) {
                element.classList.add('revealed');
                this.revealedElements.add(element);
                return;
            }

            this.revealedElements.add(element);

            // Check if this element is part of a card group
            const parentGrid = element.closest(
                '.highlight-grid, .jurusan-grid, .fasilitas-grid, .dokumentasi-grid, .dokumentasi-gallery, .artikel-grid, .indikator-list, .misi-list'
            );

            if (parentGrid) {
                // Get all cards in this grid
                const siblings = utils.qsa(
                    '.highlight-card, .jurusan-card, .fasilitas-card, .dokumentasi-item, .dokumentasi-photo, .artikel-card, .indikator-card, .misi-item',
                    parentGrid
                );

                // Find the index of this element
                const index = siblings.indexOf(element);
                if (index !== -1) {
                    const delay = index * CONFIG.REVEAL_STAGGER;
                    element.style.transitionDelay = delay + 'ms';
                }
            }

            // For history items, add stagger
            const historyList = element.closest('.history-timeline');
            if (historyList) {
                const items = utils.qsa('.history-item', historyList);
                const index = items.indexOf(element);
                if (index !== -1) {
                    const delay = index * CONFIG.REVEAL_STAGGER;
                    element.style.transitionDelay = delay + 'ms';
                }
            }

            // For kontak items, add stagger
            const kontakList = element.closest('.kontak-list');
            if (kontakList) {
                const items = utils.qsa('.kontak-item', kontakList);
                const index = items.indexOf(element);
                if (index !== -1) {
                    const delay = index * CONFIG.REVEAL_STAGGER;
                    element.style.transitionDelay = delay + 'ms';
                }
            }

            // Add the revealed class
            element.classList.add('revealed');

            // Clean up transition delay after animation
            setTimeout(() => {
                element.style.transitionDelay = '';
            }, CONFIG.REVEAL_DURATION + 200);
        },

        /** Clean up the observer */
        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        },

        /** Refresh: observe new elements that might have been added */
        refresh() {
            if (!this.isActive) return;
            if (!this.observer) {
                this.setupObserver();
                return;
            }

            const selectors = this.getSelectors();
            for (const selector of selectors) {
                const elements = utils.qsa(selector);
                for (const el of elements) {
                    if (!this.revealedElements.has(el)) {
                        this.observer.observe(el);
                        // Check if it's already visible
                        const rect = el.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        if (rect.top < viewportHeight * 0.85) {
                            this.revealElement(el);
                        }
                    }
                }
            }
        },
    };

    // ============================================================
    // 6. INTERNAL PAGE TRANSITIONS
    // ============================================================

    const PageTransition = {
        isTransitioning: false,
        transitionTimer: null,

        /** Initialize internal page transition interception */
        init() {
            if (utils.prefersReducedMotion()) return;

            // Use event delegation on document to catch all link clicks
            document.addEventListener('click', (event) => {
                const link = event.target.closest('a');
                if (!link) return;

                if (utils.shouldIntercept(event, link)) {
                    event.preventDefault();
                    this.navigateTo(link.href, link);
                }
            });

            // Handle pageshow for bfcache
            window.addEventListener('pageshow', (event) => {
                if (event.persisted) {
                    // Page was restored from bfcache, ensure it's visible
                    document.body.classList.remove('man-transitioning-out');
                    document.body.classList.add('man-entered');
                    this.isTransitioning = false;

                    // Re-initialize scroll reveal if needed
                    setTimeout(() => {
                        ScrollReveal.refresh();
                    }, 300);
                }
            });
        },

        /** Navigate to a URL with a transition */
        navigateTo(url, link) {
            if (this.isTransitioning) return;
            this.isTransitioning = true;

            // Add transition class to body
            document.body.classList.add('man-transitioning-out');

            // Apply a fade-out to the main content
            const main = document.getElementById('konten-utama');
            if (main) {
                main.style.transition = `opacity ${CONFIG.TRANSITION_DURATION}ms ease, transform ${CONFIG.TRANSITION_DURATION}ms ease`;
                main.style.opacity = '0';
                main.style.transform = 'translateY(8px)';
            }

            // Also fade out the header content
            const header = document.getElementById('site-header');
            if (header) {
                header.style.transition = `opacity ${CONFIG.TRANSITION_DURATION * 0.6}ms ease`;
                header.style.opacity = '0';
            }

            // Navigate after transition
            this.transitionTimer = setTimeout(() => {
                // Clean up styles before navigating
                if (main) {
                    main.style.transition = '';
                    main.style.opacity = '';
                    main.style.transform = '';
                }
                if (header) {
                    header.style.transition = '';
                    header.style.opacity = '';
                }
                document.body.classList.remove('man-transitioning-out');

                // Navigate
                window.location.href = url;

                // Reset transitioning state (will be reset on new page load)
                this.isTransitioning = false;
            }, CONFIG.TRANSITION_DURATION + 50);
        },

        /** Cancel an ongoing transition */
        cancel() {
            clearTimeout(this.transitionTimer);
            this.isTransitioning = false;
            document.body.classList.remove('man-transitioning-out');

            const main = document.getElementById('konten-utama');
            if (main) {
                main.style.transition = '';
                main.style.opacity = '';
                main.style.transform = '';
            }

            const header = document.getElementById('site-header');
            if (header) {
                header.style.transition = '';
                header.style.opacity = '';
            }
        },
    };

    // ============================================================
    // 7. FULLSCREEN MENU
    // ============================================================

    const FullscreenMenu = {
        menu: null,
        toggle: null,
        isOpen: false,
        scrollPosition: 0,
        bodyOverflow: '',

        /** Initialize the fullscreen menu */
        init() {
            this.menu = document.getElementById('fullscreen-menu');
            this.toggle = document.getElementById('menu-toggle');

            if (!this.menu || !this.toggle) return;

            // Toggle click
            this.toggle.addEventListener('click', () => {
                this.toggleMenu();
            });

            // Menu link clicks - close menu before navigation
            const links = utils.qsa('.fullscreen-menu-link', this.menu);
            for (const link of links) {
                link.addEventListener('click', () => {
                    this.closeMenu();
                });
            }

            // Escape key
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && this.isOpen) {
                    this.closeMenu();
                    // Focus the toggle button
                    this.toggle.focus();
                }
            });

            // Click outside the menu to close (on the backdrop)
            this.menu.addEventListener('click', (event) => {
                if (event.target === this.menu) {
                    this.closeMenu();
                }
            });

            // Handle resize - close menu on large screens (safety)
            const handleResize = utils.debounce(() => {
                if (this.isOpen && window.innerWidth >= 1024) {
                    this.closeMenu();
                }
            }, 200);
            window.addEventListener('resize', handleResize);

            // Restore state from bfcache
            window.addEventListener('pageshow', () => {
                if (this.isOpen) {
                    this.closeMenu();
                }
            });
        },

        /** Toggle menu open/close */
        toggleMenu() {
            if (this.isOpen) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        },

        /** Open the menu */
        openMenu() {
            if (this.isOpen) return;
            this.isOpen = true;

            // Store scroll position
            this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

            // Lock body scroll
            this.bodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            // Update ARIA
            this.menu.setAttribute('aria-hidden', 'false');
            this.toggle.setAttribute('aria-expanded', 'true');

            // Focus management: focus the first link
            const firstLink = this.menu.querySelector('.fullscreen-menu-link');
            if (firstLink) {
                setTimeout(() => firstLink.focus(), 100);
            }
        },

        /** Close the menu */
        closeMenu() {
            if (!this.isOpen) return;
            this.isOpen = false;

            // Restore body scroll
            document.body.style.overflow = this.bodyOverflow || '';

            // Restore scroll position
            window.scrollTo(0, this.scrollPosition);

            // Update ARIA
            this.menu.setAttribute('aria-hidden', 'true');
            this.toggle.setAttribute('aria-expanded', 'false');

            // Return focus to toggle
            this.toggle.focus();
        },

        /** Check if menu is open */
        isMenuOpen() {
            return this.isOpen;
        },
    };

    // ============================================================
    // 8. FLOATING SOCIAL BUTTONS
    // ============================================================

    const FloatingButtons = {
        container: null,
        buttons: [],
        isActive: true,

        /** Initialize floating buttons */
        init() {
            this.container = document.getElementById('floating-actions');
            if (!this.container) return;

            if (utils.prefersReducedMotion()) {
                this.isActive = false;
                return;
            }

            // The CSS already provides the float-gentle animation
            // We add a tiny additional polish: slight scale on scroll hover

            // Ensure buttons are clickable and not blocked
            const buttons = utils.qsa('.floating-btn', this.container);
            for (const btn of buttons) {
                // The click is already handled by the native link behavior
                // Just ensure pointer-events are not blocked
                btn.style.pointerEvents = 'auto';
            }

            // Add a very subtle ambient motion enhancement
            // The CSS animation is already running, we just add a tiny extra
            // "breath" effect using a subtle scale pulse
            if (this.isActive) {
                this.enhanceMotion();
            }

            // Ensure buttons stay visible above other content
            this.container.style.zIndex = '400';
        },

        /** Enhance the floating motion with subtle scale breathing */
        enhanceMotion() {
            const buttons = utils.qsa('.floating-btn', this.container);
            if (buttons.length === 0) return;

            // The CSS already has float-gentle animation.
            // We add a very subtle scale breathing using requestAnimationFrame
            // This is a tiny polish, not a replacement.

            let startTime = performance.now();

            const breathe = (timestamp) => {
                if (!this.isActive) return;
                if (!this.container) return;

                const elapsed = (timestamp - startTime) / 1000;
                const cycle = Math.sin(elapsed * 0.6); // Slow cycle

                // Apply a tiny scale variation (0.98 to 1.02)
                // Very subtle, barely noticeable
                const scale = 1 + cycle * 0.015;

                for (const btn of buttons) {
                    // Don't override hover states
                    if (!btn.matches(':hover')) {
                        btn.style.transform = `scale(${scale})`;
                    }
                }

                requestAnimationFrame(breathe);
            };

            // Start with a small delay
            setTimeout(() => {
                requestAnimationFrame(breathe);
            }, 500);

            // Clean up on page unload
            window.addEventListener('beforeunload', () => {
                this.isActive = false;
            });
        },

        /** Clean up */
        destroy() {
            this.isActive = false;
        },
    };

    // ============================================================
    // 9. FOCUS MANAGEMENT & ACCESSIBILITY
    // ============================================================

    const Accessibility = {
        /** Initialize focus management */
        init() {
            // Ensure skip link works
            const skipLink = document.querySelector('.skip-link');
            if (skipLink) {
                skipLink.addEventListener('click', (event) => {
                    const target = document.getElementById('konten-utama');
                    if (target) {
                        event.preventDefault();
                        target.setAttribute('tabindex', '-1');
                        target.focus();
                        // Remove tabindex after focus to avoid issues
                        setTimeout(() => {
                            target.removeAttribute('tabindex');
                        }, 500);
                    }
                });
            }

            // Ensure all interactive elements are focusable
            // (already handled by HTML)
        },
    };

    // ============================================================
    // 10. CARD GROUP STAGGER — CSS Enhancement
    // ============================================================

    const CardStagger = {
        /** Add staggered reveal to card groups via CSS classes */
        init() {
            if (utils.prefersReducedMotion()) return;

            // The scroll reveal system already handles stagger via JavaScript
            // This is a complementary system that adds CSS classes for
            // card groups that are already in the viewport

            // Find all card groups and mark them for stagger
            const groups = utils.qsa(
                '.highlight-grid, .jurusan-grid, .fasilitas-grid, .dokumentasi-grid, .dokumentasi-gallery, .artikel-grid, .indikator-list, .misi-list'
            );

            for (const group of groups) {
                group.classList.add('man-stagger-group');
            }

            // If any group is already in the viewport, reveal its children
            // with stagger using IntersectionObserver on the group itself
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver(
                    (entries) => {
                        for (const entry of entries) {
                            if (entry.isIntersecting) {
                                const group = entry.target;
                                const children = utils.qsa(
                                    '.highlight-card, .jurusan-card, .fasilitas-card, .dokumentasi-item, .dokumentasi-photo, .artikel-card, .indikator-card, .misi-item, .history-item',
                                    group
                                );
                                for (let i = 0; i < children.length; i++) {
                                    const child = children[i];
                                    // Only if not already revealed
                                    if (!child.classList.contains('revealed')) {
                                        const delay = i * CONFIG.REVEAL_STAGGER;
                                        child.style.transitionDelay = delay + 'ms';
                                        child.classList.add('revealed');
                                        setTimeout(() => {
                                            child.style.transitionDelay = '';
                                        }, CONFIG.REVEAL_DURATION + delay + 200);
                                    }
                                }
                                observer.unobserve(group);
                            }
                        }
                    },
                    { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
                );

                for (const group of groups) {
                    observer.observe(group);
                }

                // Store observer for cleanup
                this.observer = observer;
            }
        },

        /** Clean up */
        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        },
    };

    // ============================================================
    // 11. REDUCED MOTION — Apply early
    // ============================================================

    const ReducedMotion = {
        /** Apply reduced motion adjustments */
        init() {
            if (!utils.prefersReducedMotion()) return;

            // Add a class to the body for CSS targeting
            document.body.classList.add('man-reduced-motion');

            // Disable floating button animation
            const floatingBtns = utils.qsa('.floating-btn');
            for (const btn of floatingBtns) {
                btn.style.animation = 'none';
            }

            // Disable loading screen animation (but keep it functional)
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.animation = 'none';
                // But keep it visible until hidden by JavaScript
            }

            // The CSS already handles reduced motion via @media query
            // This JavaScript enhancement ensures JavaScript-driven animations are also reduced
        },
    };

    // ============================================================
    // 12. CSS CLASSES — Add required CSS for scroll reveal
    // ============================================================

    // We need to inject a small amount of CSS for the scroll reveal
    // since we can't modify style.css directly
    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            /* Scroll Reveal - injected by JavaScript */
            .section-heading,
            .highlight-card,
            .jurusan-card,
            .fasilitas-card,
            .dokumentasi-item,
            .dokumentasi-photo,
            .artikel-card,
            .history-item,
            .indikator-card,
            .misi-item,
            .speech-card,
            .organisasi-card,
            .vision-statement-card,
            .about-text,
            .kontak-item {
                opacity: 0;
                transform: translateY(18px);
                transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1),
                            transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
                will-change: opacity, transform;
            }

            .section-heading.revealed,
            .highlight-card.revealed,
            .jurusan-card.revealed,
            .fasilitas-card.revealed,
            .dokumentasi-item.revealed,
            .dokumentasi-photo.revealed,
            .artikel-card.revealed,
            .history-item.revealed,
            .indikator-card.revealed,
            .misi-item.revealed,
            .speech-card.revealed,
            .organisasi-card.revealed,
            .vision-statement-card.revealed,
            .about-text.revealed,
            .kontak-item.revealed {
                opacity: 1;
                transform: translateY(0);
            }

            /* Stagger group class */
            .man-stagger-group .highlight-card,
            .man-stagger-group .jurusan-card,
            .man-stagger-group .fasilitas-card,
            .man-stagger-group .dokumentasi-item,
            .man-stagger-group .dokumentasi-photo,
            .man-stagger-group .artikel-card,
            .man-stagger-group .indikator-card,
            .man-stagger-group .misi-item {
                transition-delay: 0ms;
            }

            /* Reduced motion override */
            .man-reduced-motion .section-heading,
            .man-reduced-motion .highlight-card,
            .man-reduced-motion .jurusan-card,
            .man-reduced-motion .fasilitas-card,
            .man-reduced-motion .dokumentasi-item,
            .man-reduced-motion .dokumentasi-photo,
            .man-reduced-motion .artikel-card,
            .man-reduced-motion .history-item,
            .man-reduced-motion .indikator-card,
            .man-reduced-motion .misi-item,
            .man-reduced-motion .speech-card,
            .man-reduced-motion .organisasi-card,
            .man-reduced-motion .vision-statement-card,
            .man-reduced-motion .about-text,
            .man-reduced-motion .kontak-item {
                opacity: 1 !important;
                transform: translateY(0) !important;
                transition: none !important;
            }

            .man-reduced-motion .man-stagger-group .highlight-card,
            .man-reduced-motion .man-stagger-group .jurusan-card,
            .man-reduced-motion .man-stagger-group .fasilitas-card,
            .man-reduced-motion .man-stagger-group .dokumentasi-item,
            .man-reduced-motion .man-stagger-group .dokumentasi-photo,
            .man-reduced-motion .man-stagger-group .artikel-card,
            .man-reduced-motion .man-stagger-group .indikator-card,
            .man-reduced-motion .man-stagger-group .misi-item {
                transition: none !important;
            }

            /* Page transition states */
            .man-transitioning-out #konten-utama {
                pointer-events: none;
            }

            /* Entrance state for main content */
            #konten-utama {
                opacity: 1;
                transform: translateY(0);
                transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1),
                            transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* Reduced motion for page entrance */
            .man-reduced-motion #konten-utama {
                transition: none !important;
                opacity: 1 !important;
                transform: translateY(0) !important;
            }

            /* Header transition protection */
            .man-transitioning-out #site-header {
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    };

    // ============================================================
    // 13. SAFE INITIALIZATION
    // ============================================================

    const init = () => {
        // Inject required CSS first
        injectStyles();

        // Apply reduced motion preferences early
        ReducedMotion.init();

        // Initialize loading system (critical)
        LoadingSystem.init();

        // Initialize accessibility
        Accessibility.init();

        // Initialize fullscreen menu
        FullscreenMenu.init();

        // Initialize internal page transitions (after loading)
        // Wait for loading to complete before enabling transitions
        const enableTransitions = () => {
            PageTransition.init();
        };

        if (LoadingSystem.isComplete()) {
            enableTransitions();
        } else {
            document.addEventListener('man-loading-complete', enableTransitions);
            // Fallback: if event doesn't fire, enable after 5s
            setTimeout(enableTransitions, 5000);
        }

        // Initialize scroll reveal (will wait for entrance)
        ScrollReveal.init();

        // Initialize card stagger
        CardStagger.init();

        // Initialize floating buttons
        FloatingButtons.init();

        // Handle bfcache restoration
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                // Page restored from bfcache
                // Ensure loading is complete
                if (!LoadingSystem.isComplete()) {
                    LoadingSystem.onContentReady();
                }

                // Refresh scroll reveal
                setTimeout(() => {
                    ScrollReveal.refresh();
                }, 300);

                // Reset page transition state
                document.body.classList.remove('man-transitioning-out');
                document.body.classList.add('man-entered');

                // Reset any stuck styles
                const main = document.getElementById('konten-utama');
                if (main) {
                    main.style.transition = '';
                    main.style.opacity = '';
                    main.style.transform = '';
                }

                const header = document.getElementById('site-header');
                if (header) {
                    header.style.transition = '';
                    header.style.opacity = '';
                }
            }
        });

        // Handle browser visibility change (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Tab became visible again, refresh scroll reveal
                setTimeout(() => {
                    ScrollReveal.refresh();
                }, 400);
            }
        });

        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            ScrollReveal.destroy();
            CardStagger.destroy();
            FloatingButtons.destroy();
            PageTransition.cancel();
        });

        // Mark initialization complete
        document.body.classList.add('man-initialized');
    };

    // ============================================================
    // 14. START
    // ============================================================

    // Wait for DOM to be ready before initializing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already ready
        // Use requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(init);
    }

    // Additional safety: if DOMContentLoaded already fired but we're in a
    // weird state, schedule init anyway
    if (document.readyState !== 'loading') {
        // Already loaded or interactive
        setTimeout(() => {
            if (!document.body.classList.contains('man-initialized')) {
                init();
            }
        }, 100);
    }

})();
```
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initLoadingScreen();
    initFullscreenMenu();
  });

  /**
   * The 5-second visual timing and fade are handled entirely by the existing
   * CSS animation (loading-screen-exit on #loading-screen). This only cleans
   * up the element once that animation ends, so it stops blocking clicks and
   * is removed from the accessibility tree. A fallback timeout guarantees the
   * overlay is never left covering the page if the animation event is missed.
   */
  function initLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    let finished = false;
    const finishLoading = () => {
      if (finished) return;
      finished = true;
      loadingScreen.setAttribute('aria-hidden', 'true');
      loadingScreen.style.display = 'none';
    };

    loadingScreen.addEventListener('animationend', (event) => {
      if (event.target === loadingScreen && event.animationName === 'loading-screen-exit') {
        finishLoading();
      }
    });

    window.setTimeout(finishLoading, 6000);
  }

  /**
   * Fullscreen menu: toggles the existing aria-expanded / aria-hidden state
   * already present in the HTML, locks background scroll while open (using
   * the position:fixed technique so mobile Safari doesn't jump), and restores
   * everything on close.
   */
  function initFullscreenMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const fullscreenMenu = document.getElementById('fullscreen-menu');
    if (!menuToggle || !fullscreenMenu) return;

    let isOpen = false;
    let savedScrollY = 0;

    const openMenu = () => {
      isOpen = true;
      savedScrollY = window.scrollY;
      menuToggle.setAttribute('aria-expanded', 'true');
      fullscreenMenu.setAttribute('aria-hidden', 'false');
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + savedScrollY + 'px';
      document.body.style.width = '100%';

      const firstLink = fullscreenMenu.querySelector('.fullscreen-menu-link');
      if (firstLink) firstLink.focus();
    };

    const closeMenu = () => {
      isOpen = false;
      menuToggle.setAttribute('aria-expanded', 'false');
      fullscreenMenu.setAttribute('aria-hidden', 'true');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, savedScrollY);
    };

    menuToggle.addEventListener('click', () => {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
        menuToggle.focus();
      }
    });

    const menuLinks = fullscreenMenu.querySelectorAll('.fullscreen-menu-link');
    menuLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (isOpen) {
          closeMenu();
        }
      });
    });
  }
})();

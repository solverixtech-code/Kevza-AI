(function () {
  var sidebarScrollKey = 'kevza-admin-sidebar-scroll';

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function normalizePath(path) {
    return path.replace(/\\/g, '/').split('/').pop() || 'index.html';
  }

  function getSidebar() {
    return document.querySelector('.admin-sidebar');
  }

  function restoreSidebarScroll() {
    var sidebar = getSidebar();
    if (!sidebar) return;

    var savedTop = Number(sessionStorage.getItem(sidebarScrollKey));
    if (Number.isFinite(savedTop) && savedTop > 0) {
      sidebar.scrollTop = savedTop;
    }
  }

  function saveSidebarScroll(sidebar) {
    if (sidebar) {
      sessionStorage.setItem(sidebarScrollKey, String(sidebar.scrollTop));
    }
  }

  function preservePosition(sidebar, pageX, pageY, sidebarTop) {
    requestAnimationFrame(function () {
      window.scrollTo(pageX, pageY);
      if (sidebar) sidebar.scrollTop = sidebarTop;
    });
  }

  function activate(link) {
    var nav = link.closest('.admin-nav');
    if (!nav) return;

    nav.querySelectorAll('a.is-active, a.active').forEach(function (item) {
      item.classList.remove('is-active', 'active');
      item.removeAttribute('aria-current');
    });

    link.classList.add('is-active');
    link.setAttribute('aria-current', 'page');
  }

  function activateCurrentPage() {
    var currentPage = normalizePath(window.location.pathname);
    var links = document.querySelectorAll('.admin-nav a[href]');

    links.forEach(function (link) {
      var rawHref = link.getAttribute('href') || '';
      if (rawHref === '#' || rawHref.trim() === '' || rawHref.indexOf('javascript:void(0)') === 0 || link.dataset.navPlaceholder === 'true') {
        return;
      }

      var target;
      try {
        target = new URL(rawHref, window.location.href);
      } catch (error) {
        return;
      }

      if (target.origin === window.location.origin && normalizePath(target.pathname) === currentPage) {
        activate(link);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    activateCurrentPage();
    restoreSidebarScroll();
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest('.admin-nav a');
    if (!link) return;

    var sidebar = link.closest('.admin-sidebar');
    var sidebarTop = sidebar ? sidebar.scrollTop : 0;
    var pageX = window.scrollX;
    var pageY = window.scrollY;
    var rawHref = link.getAttribute('href') || '';
    var currentPage = normalizePath(window.location.pathname);
    var target;

    try {
      target = new URL(rawHref, window.location.href);
    } catch (error) {
      return;
    }

    var samePage = normalizePath(target.pathname) === currentPage && target.origin === window.location.origin;
    var placeholder = rawHref === '#' || rawHref.trim() === '' || rawHref.indexOf('javascript:void(0)') === 0 || link.dataset.navPlaceholder === 'true';
    var currentPageLink = samePage && !target.hash;
    var emptyHash = samePage && target.hash === '#';

    if (placeholder || currentPageLink || emptyHash) {
      event.preventDefault();
      activate(link);
      preservePosition(sidebar, pageX, pageY, sidebarTop);
      return;
    }

    if (target.origin === window.location.origin) {
      activate(link);
      saveSidebarScroll(sidebar);
    }
  }, true);
}());

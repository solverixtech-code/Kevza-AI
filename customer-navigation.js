(function () {
  var sidebarScrollKey = 'kevza-customer-sidebar-scroll';
  var authStorageKey = 'kevza.auth';
  var customerRoles = ['OWNER', 'TEAM_MEMBER'];

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function normalizePath(path) {
    return path.replace(/\\/g, '/').split('/').pop() || 'customer-dashboard.html';
  }

  function getAuthSession() {
    try {
      var raw = localStorage.getItem(authStorageKey) || sessionStorage.getItem(authStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function enforceCustomerAccess() {
    var session = getAuthSession();
    var role = session && session.user ? session.user.role : null;

    if (!role) {
      window.location.replace('login.html');
      return false;
    }

    if (customerRoles.indexOf(role) === -1) {
      window.location.replace('admin-profile.html');
      return false;
    }

    return true;
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

  function renderNavigation() {
    var items = [
      ['customer-dashboard.html', '&#8962;', 'Dashboard'],
      ['all-customers.html', '&#9783;', 'Customers / Contacts'],
      ['messaging-dashboard.html', '&#9993;', 'Inbox / Messaging', false, '<i class="nav-alert">3</i>'],
      ['javascript:void(0)', '&#9636;', 'Templates', true],
      ['campaign-operations-dashboard.html', '&#9873;', 'Campaigns'],
      ['ai-operations-dashboard.html', '&#9881;', 'Chatbots &amp; AI'],
      ['automation-operations-dashboard.html', '&#8984;', 'Automation'],
      ['channel-operations-dashboard.html', '&#8644;', 'Channels'],
      ['subscription-dashboard.html', '&#9635;', 'Billing / Plan'],
      ['security.html', '&#9881;', 'Settings / Profile']
    ];

    document.querySelectorAll('.admin-nav').forEach(function (nav) {
      nav.setAttribute('aria-label', 'Customer navigation');
      nav.innerHTML = items.map(function (item) {
        var placeholder = item[3] ? ' data-nav-placeholder="true"' : '';
        var badge = item[4] || '';
        return '<a href="' + item[0] + '"' + placeholder + '><span>' + item[1] + '</span>' + item[2] + badge + '</a>';
      }).join('');
    });
  }

  function activateCurrentPage() {
    var currentPage = normalizePath(window.location.pathname);
    var aliases = {
      'customer-growth-dashboard.html': 'all-customers.html',
      'login-history.html': 'security.html',
      'active-sessions.html': 'security.html',
      'change-password.html': 'security.html',
      'notification-preferences.html': 'security.html'
    };
    currentPage = aliases[currentPage] || currentPage;

    document.querySelectorAll('.admin-nav a[href]').forEach(function (link) {
      var rawHref = link.getAttribute('href') || '';
      if (rawHref === '#' || rawHref.trim() === '' || rawHref.indexOf('javascript:void(0)') === 0 || link.dataset.navPlaceholder === 'true') return;
      var target;
      try { target = new URL(rawHref, window.location.href); } catch (error) { return; }
      if (target.origin === window.location.origin && normalizePath(target.pathname) === currentPage) activate(link);
    });
  }

  function restoreSidebarScroll() {
    var sidebar = document.querySelector('.admin-sidebar');
    if (!sidebar) return;
    var savedTop = Number(sessionStorage.getItem(sidebarScrollKey));
    if (Number.isFinite(savedTop) && savedTop > 0) sidebar.scrollTop = savedTop;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!enforceCustomerAccess()) return;
    renderNavigation();
    activateCurrentPage();
    restoreSidebarScroll();
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest('.admin-nav a');
    if (!link) return;
    var sidebar = link.closest('.admin-sidebar');
    var rawHref = link.getAttribute('href') || '';
    var placeholder = rawHref === '#' || rawHref.trim() === '' || rawHref.indexOf('javascript:void(0)') === 0 || link.dataset.navPlaceholder === 'true';
    if (placeholder) {
      event.preventDefault();
      activate(link);
      return;
    }
    if (sidebar) sessionStorage.setItem(sidebarScrollKey, String(sidebar.scrollTop));
  }, true);
}());

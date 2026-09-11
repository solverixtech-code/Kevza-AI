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

  function formatRole(role) {
    if (role === 'OWNER') return 'Owner';
    if (role === 'TEAM_MEMBER') return 'Team Member';
    return 'Customer';
  }

  function getInitials(name, email) {
    var source = (name || email || 'User').trim();
    var parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }

  function hydrateCurrentUser() {
    var session = getAuthSession();
    var user = session && session.user ? session.user : null;
    if (!user) return;

    var displayName = user.name || user.email || 'Customer User';
    var roleLabel = formatRole(user.role);
    var initials = getInitials(user.name, user.email);

    document.querySelectorAll('.sidebar-user, .customer-user, .top-user, .ptb-user').forEach(function (container) {
      var strong = container.querySelector('strong');
      var span = container.querySelector('span');
      var avatar = container.querySelector('.mini-avatar');

      if (strong) strong.textContent = displayName;
      if (span) span.textContent = roleLabel;
      if (avatar) avatar.textContent = initials;
    });

    var heroTitle = document.querySelector('.customer-hero-row h1');
    if (heroTitle) {
      heroTitle.innerHTML = 'Good morning, ' + displayName + '! <span aria-hidden="true">&#128075;</span>';
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
      ['templates.html', '&#9636;', 'Templates'],
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
    hydrateCurrentUser();
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

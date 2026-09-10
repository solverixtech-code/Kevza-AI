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
    if (currentPage === 'professional-plan.html' || currentPage === 'plan-features.html') currentPage = 'plans-and-pricing.html';
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

  function setupSidebarResizer() {
    var sidebar = getSidebar();
    var app = sidebar && sidebar.closest('.admin-app');
    if (!sidebar || !app || sidebar.querySelector('.admin-sidebar-resizer')) return;

    var resizer = document.createElement('div');
    resizer.className = 'admin-sidebar-resizer';
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-label', 'Resize navigation sidebar');
    resizer.setAttribute('aria-orientation', 'vertical');
    sidebar.appendChild(resizer);

    var isEnterpriseShell = false;
    var isProfileShell = false;
    var minWidth = isEnterpriseShell ? 130 : (isProfileShell ? 155 : 220);
    var maxWidth = 320;
    var defaultWidth = 268;
    app.style.setProperty('--admin-sidebar-width', defaultWidth + 'px');

    var savedWidth = Number(localStorage.getItem('kevza-admin-sidebar-width'));
    if (Number.isFinite(savedWidth)) {
      app.style.setProperty('--admin-sidebar-width', Math.max(minWidth, Math.min(maxWidth, savedWidth)) + 'px');
    }

    resizer.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      resizer.classList.add('is-dragging');
      document.body.classList.add('is-resizing-sidebar');
      resizer.setPointerCapture(event.pointerId);
    });

    resizer.addEventListener('pointermove', function (event) {
      if (!resizer.hasPointerCapture(event.pointerId)) return;
      var width = Math.max(minWidth, Math.min(maxWidth, event.clientX));
      app.style.setProperty('--admin-sidebar-width', width + 'px');
      localStorage.setItem('kevza-admin-sidebar-width', String(width));
    });

    function stopResize(event) {
      if (event && resizer.hasPointerCapture(event.pointerId)) resizer.releasePointerCapture(event.pointerId);
      resizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-sidebar');
    }

    resizer.addEventListener('pointerup', stopResize);
    resizer.addEventListener('pointercancel', stopResize);
  }
  function renderPrimaryNavigation() {
    var items = [
      ['admin-profile.html', '&#8962;', 'Dashboard'],
      ['enterprise-customers.html', '&#9635;', 'Enterprise Customers'],
      ['customer-growth-dashboard.html', '&#9673;', 'Customer Growth'],
      ['all-customers.html', '&#9783;', 'Customer Directory'],
      ['javascript:void(0)', '&#9783;', 'Customers', true],
      ['javascript:void(0)', '&#9671;', 'Plans &amp; Subscriptions', true],
      ['subscription-dashboard.html', '&#9673;', 'Subscription Dashboard'],
      ['plans-and-pricing.html', '&#9671;', 'Plans &amp; Pricing'],
      ['customer-activation-queue.html', '&#9673;', 'Customer Activation Queue'],
      ['billing-wallet.html', '&#9635;', 'Billing &amp; Wallet'],
      ['javascript:void(0)', '&#9673;', 'Channels', true],
      ['channel-operations-dashboard.html', '&#9638;', 'Channel Operations'],
      ['javascript:void(0)', '&#9636;', 'Templates', true, false],
      ['campaign-operations-dashboard.html', '&#9992;', 'Campaign Operations'],
      ['javascript:void(0)', '&#9743;', 'Chatbots &amp; AI', true],
      ['ai-operations-dashboard.html', '&#9672;', 'AI Operations'],
      ['automation-operations-dashboard.html', '&#8984;', 'Automation Operations'],
      ['messaging-dashboard.html', '&#9673;', 'Messaging Dashboard'],
      ['javascript:void(0)', '&#9881;', 'CRM &amp; Integrations', true],
      ['javascript:void(0)', '&#9637;', 'Platform Usage', true, false],
      ['cost-margin-dashboard.html', '&#9649;', 'Cost &amp; Margin'],
      ['javascript:void(0)', '&#9637;', 'Analytics &amp; Reports', true],
      ['javascript:void(0)', '&#9825;', 'Customer Success', true],
      ['support-dashboard.html', '&#9678;', 'Support Dashboard'],
      ['live-operations-center.html', '&#9636;', 'Live Operations Center'],
      ['security.html', '&#9672;', 'My Security'],
      ['login-history.html', '&#9672;', 'Login History'],
      ['active-sessions.html', '&#9635;', 'Active Sessions'],
      ['change-password.html', '&#11039;', 'Change Password'],
      ['notification-preferences.html', '&#9673;', 'Notification Preferences'],
      ['infrastructure-health.html', '&#9638;', 'System Operations'],
      ['compliance-dashboard.html', '&#9638;', 'Compliance Dashboard'],
      ['javascript:void(0)', '&#9638;', 'System Health', true, false],
      ['javascript:void(0)', '&#9881;', 'Settings', true]
    ];

    document.querySelectorAll('.admin-nav').forEach(function (nav) {
      nav.setAttribute('aria-label', 'Admin navigation');
      nav.innerHTML = items.map(function (item) {
        var placeholder = item[3] ? ' data-nav-placeholder="true"' : '';
        var arrow = item[3] && item[4] !== false ? ' <b>&rsaquo;</b>' : '';
        return '<a href="' + item[0] + '"' + placeholder + '><span>' + item[1] + '</span>' + item[2] + arrow + '</a>';
      }).join('');
    });
  }
  function ensureCustomerGrowthLink() {
    document.querySelectorAll('.admin-nav').forEach(function (nav) {
      if (nav.querySelector('a[href="customer-growth-dashboard.html"]')) return;
      var link = document.createElement('a');
      link.href = 'customer-growth-dashboard.html';
      link.innerHTML = '<span>&#9673;</span>Customer Growth';
      nav.insertBefore(link, nav.children[1] || null);
    });
  }
  function ensureAllCustomersLink() {
    document.querySelectorAll('.admin-nav').forEach(function (nav) {
      if (nav.querySelector('a[href="all-customers.html"]')) return;
      var link = document.createElement('a');
      link.href = 'all-customers.html';
      link.innerHTML = '<span>&#9783;</span>Customer Directory';
      var growth = nav.querySelector('a[href="customer-growth-dashboard.html"]');
      if (growth) nav.insertBefore(link, growth.nextElementSibling);
      else nav.appendChild(link);
    });
  }
  function ensureEnterpriseCustomersLink() {
    document.querySelectorAll('.admin-nav').forEach(function (nav) {
      if (nav.querySelector('a[href="enterprise-customers.html"]')) return;
      var link = document.createElement('a');
      link.href = 'enterprise-customers.html';
      link.innerHTML = '<span>&#9635;</span>Enterprise Customers';
      nav.insertBefore(link, nav.children[1] || null);
    });
  }
  function normalizePrimaryNavOrder() {
    document.querySelectorAll('.admin-nav').forEach(function (nav) {
      var dashboard = nav.querySelector('a[href="admin-profile.html"]');
      var enterprise = nav.querySelector('a[href="enterprise-customers.html"]');
      var allCustomers = nav.querySelector('a[href="all-customers.html"]');
      var customers = nav.querySelector('a[href="#"]');
      var plans = nav.querySelector('a[href="#"]');
      var subscription = nav.querySelector('a[href="subscription-dashboard.html"]');
      var growth = nav.querySelector('a[href="customer-growth-dashboard.html"]');

      if (dashboard && enterprise) nav.insertBefore(enterprise, dashboard.nextElementSibling);
      if (subscription && growth) nav.insertBefore(growth, subscription.nextElementSibling);
      if (growth && allCustomers) nav.insertBefore(allCustomers, growth.nextElementSibling);
    });
  }
  function ensureActivationQueueLink() {
    document.querySelectorAll('.admin-nav').forEach(function (nav) {
      if (nav.querySelector('a[href="customer-activation-queue.html"]')) return;
      var link = document.createElement('a');
      link.href = 'customer-activation-queue.html';
      link.innerHTML = '<span>&#9673;</span>Customer Activation Queue';
      var growth = nav.querySelector('a[href="customer-growth-dashboard.html"]');
      if (growth) nav.insertBefore(link, growth.nextElementSibling);
      else nav.appendChild(link);
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    renderPrimaryNavigation();
    ensureEnterpriseCustomersLink();
    ensureActivationQueueLink();
    ensureCustomerGrowthLink();
    ensureAllCustomersLink();
    normalizePrimaryNavOrder();
    activateCurrentPage();
    restoreSidebarScroll();
    if (!document.body.classList.contains('activation-queue-page')) setupSidebarResizer();
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




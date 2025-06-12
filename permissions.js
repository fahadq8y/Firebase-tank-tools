/**
 * Tank Tools - نظام إدارة الصلاحيات
 * Developer: Fahad - 17877
 * Version: 1.0
 */

// تعريف أنواع المستخدمين والصلاحيات الافتراضية
const USER_TYPES = {
  admin: {
    allowedPages: ['all'],
    permissions: {
      canViewLiveTanks: true,
      canEditLiveTanks: true,
      canAddToLiveTanks: true,
      canDeleteFromLiveTanks: true,
      canManageUsers: true
    }
  },
  control_panel: {
    allowedPages: ['live-tanks.html', 'dashboard.html'],
    permissions: {
      canViewLiveTanks: true,
      canEditLiveTanks: true,
      canAddToLiveTanks: true,
      canDeleteFromLiveTanks: true,
      canManageUsers: false
    }
  },
  pbcr_supervisor: {
    allowedPages: ['index.html', 'dashboard.html'],
    permissions: {
      canViewLiveTanks: false,
      canEditLiveTanks: false,
      canAddToLiveTanks: true,
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  pbcr_planning: {
    allowedPages: ['index.html', 'dashboard.html'],
    permissions: {
      canViewLiveTanks: false,
      canEditLiveTanks: false,
      canAddToLiveTanks: false,
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  plcr_supervisor: {
    allowedPages: ['plcr.html', 'dashboard.html'],
    permissions: {
      canViewLiveTanks: false,
      canEditLiveTanks: false,
      canAddToLiveTanks: true,
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  plcr_planning: {
    allowedPages: ['plcr.html', 'dashboard.html'],
    permissions: {
      canViewLiveTanks: false,
      canEditLiveTanks: false,
      canAddToLiveTanks: false,
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  nmogas_supervisor: {
    allowedPages: ['NMOGASBL.html', 'dashboard.html'],
    permissions: {
      canViewLiveTanks: false,
      canEditLiveTanks: false,
      canAddToLiveTanks: true,
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  nmogas_planning: {
    allowedPages: ['NMOGASBL.html', 'dashboard.html'],
    permissions: {
      canViewLiveTanks: false,
      canEditLiveTanks: false,
      canAddToLiveTanks: false,
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  viewer: {
    allowedPages: ['dashboard.html'],
    permissions: {
      canViewLiveTanks: false,
      canEditLiveTanks: false,
      canAddToLiveTanks: false,
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  }
};

// الحصول على بيانات المستخدم الحالي
function getCurrentUser() {
  // فحص الجلسة أولاً
  const session = sessionStorage.getItem('tanktools_session');
  if (session !== 'active') {
    return null;
  }
  
  // الحصول على بيانات المستخدم
  const userData = localStorage.getItem('tanktools_current_user');
  if (!userData) {
    return null;
  }
  
  try {
    const user = JSON.parse(userData);
    // التأكد من صحة بيانات المستخدم
    if (user && user.username && (user.role || user.userType)) {
      return user;
    }
    return null;
  } catch (e) {
    console.error('خطأ في قراءة بيانات المستخدم:', e);
    return null;
  }
}

// فحص صلاحية الوصول للصفحة الحالية
function checkPageAccess() {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin();
    return false;
  }

  const currentPage = getCurrentPageName();
  const hasAccess = checkUserPageAccess(user, currentPage);
  
  if (!hasAccess) {
    showAccessDenied();
    return false;
  }

  // تطبيق صلاحيات الوظائف
  applyFeaturePermissions(user);
  return true;
}

// الحصول على اسم الصفحة الحالية
function getCurrentPageName() {
  const path = window.location.pathname;
  const fileName = path.split('/').pop() || 'index.html';
  return fileName;
}

// فحص صلاحية المستخدم للصفحة
function checkUserPageAccess(user, pageName) {
  // الأدمن يصل لكل شيء
  if (user.userType === 'admin' || user.isAdmin || user.role === 'admin') {
    return true;
  }

  // إذا كان المستخدم يستخدم النظام القديم (role بدلاً من userType)
  if (user.role && !user.userType) {
    // السماح للمستخدمين القدامى بالوصول للصفحات الأساسية
    const allowedPagesForOldUsers = ['index.html', 'plcr.html', 'NMOGASBL.html', 'dashboard.html', 'live-tanks.html'];
    return allowedPagesForOldUsers.includes(pageName);
  }

  // فحص الصفحات المسموحة للمستخدمين الجدد
  const userConfig = USER_TYPES[user.userType];
  if (!userConfig) {
    console.error('نوع مستخدم غير معروف:', user.userType);
    return false;
  }

  // إذا كان المستخدم له صلاحية "all"
  if (userConfig.allowedPages.includes('all')) {
    return true;
  }

  // فحص الصفحة المحددة
  return userConfig.allowedPages.includes(pageName);
}

// تطبيق صلاحيات الوظائف على الصفحة
function applyFeaturePermissions(user) {
  // إذا كان المستخدم يستخدم النظام القديم
  if (user.role && !user.userType) {
    // تطبيق الصلاحيات الافتراضية للنظام القديم
    const isAdmin = user.role === 'admin' || user.isAdmin;
    const canAccessLiveTanks = ['admin', 'panel_operator', 'supervisor'].includes(user.role);
    
    hideElementIfNoPermission('live-tanks-btn', canAccessLiveTanks);
    hideElementIfNoPermission('add-to-live-tanks-btn', canAccessLiveTanks);
    hideElementIfNoPermission('user-management-link', isAdmin);
    hideElementIfNoPermission('nav-admin', isAdmin);
    return;
  }

  // للمستخدمين الجدد مع نظام userType
  const userConfig = USER_TYPES[user.userType] || {};
  const permissions = userConfig.permissions || {};

  // إخفاء أزرار Live Tanks حسب الصلاحيات
  hideElementIfNoPermission('live-tanks-btn', permissions.canViewLiveTanks);
  hideElementIfNoPermission('add-to-live-tanks-btn', permissions.canAddToLiveTanks);
  hideElementIfNoPermission('edit-live-tanks-btn', permissions.canEditLiveTanks);
  hideElementIfNoPermission('delete-live-tanks-btn', permissions.canDeleteFromLiveTanks);
  
  // إخفاء رابط إدارة المستخدمين
  hideElementIfNoPermission('user-management-link', permissions.canManageUsers);
  hideElementIfNoPermission('nav-admin', permissions.canManageUsers);

  // تطبيق صلاحيات على الروابط في القائمة العلوية
  applyNavigationPermissions(user);
}

// إخفاء عنصر إذا لم تكن هناك صلاحية
function hideElementIfNoPermission(elementId, hasPermission) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = hasPermission ? 'block' : 'none';
  }
}

// تطبيق صلاحيات على القائمة العلوية
function applyNavigationPermissions(user) {
  const userConfig = USER_TYPES[user.userType] || {};
  const allowedPages = userConfig.allowedPages || [];

  // إخفاء الروابط غير المسموحة
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !allowedPages.includes('all')) {
      const isAllowed = allowedPages.some(page => href.includes(page.replace('.html', '')));
      if (!isAllowed) {
        link.style.display = 'none';
      }
    }
  });
}

// إظهار رسالة منع الوصول
function showAccessDenied() {
  document.body.innerHTML = `
    <div class="access-denied">
      <div class="access-denied-content">
        <div class="access-denied-icon">🚫</div>
        <div class="access-denied-title">Access Denied</div>
        <div class="access-denied-text">ليس لديك صلاحية للوصول لهذه الصفحة</div>
        <div class="access-denied-text">You don't have permission to access this page</div>
        <button class="login-btn" onclick="redirectToLogin()">العودة لتسجيل الدخول</button>
      </div>
    </div>
  `;
}

// إعادة التوجيه لصفحة تسجيل الدخول
function redirectToLogin() {
  // حفظ الصفحة الحالية للعودة إليها بعد تسجيل الدخول
  const currentPage = getCurrentPageName();
  if (currentPage !== 'login.html') {
    sessionStorage.setItem('tanktools_redirect', currentPage);
  }
  
  // مسح الجلسة الحالية
  sessionStorage.removeItem('tanktools_session');
  localStorage.removeItem('tanktools_current_user');
  
  // التوجه لصفحة تسجيل الدخول
  window.location.href = 'login.html';
}

// فحص صلاحية وظيفة معينة
function hasPermission(permissionName) {
  const user = getCurrentUser();
  if (!user) return false;
  
  // الأدمن له كل الصلاحيات
  if (user.userType === 'admin' || user.isAdmin || user.role === 'admin') return true;
  
  // إذا كان المستخدم يستخدم النظام القديم
  if (user.role && !user.userType) {
    // صلاحيات افتراضية للنظام القديم
    switch (permissionName) {
      case 'canManageUsers':
        return user.role === 'admin' || user.isAdmin;
      case 'canViewLiveTanks':
      case 'canEditLiveTanks':
      case 'canAddToLiveTanks':
        return ['admin', 'panel_operator', 'supervisor'].includes(user.role);
      default:
        return false;
    }
  }
  
  // للمستخدمين الجدد مع نظام userType
  const userConfig = USER_TYPES[user.userType];
  return userConfig && userConfig.permissions && userConfig.permissions[permissionName];
}

// تسجيل نشاط المستخدم
function logUserActivity(action, details = '') {
  const user = getCurrentUser();
  if (!user) return;

  const activity = {
    username: user.username,
    action: action,
    details: details,
    timestamp: new Date().toISOString(),
    page: getCurrentPageName(),
    userAgent: navigator.userAgent
  };

  // حفظ النشاط في localStorage مؤقتاً
  const activities = JSON.parse(localStorage.getItem('tanktools_activities') || '[]');
  activities.push(activity);
  
  // الاحتفاظ بآخر 100 نشاط فقط
  if (activities.length > 100) {
    activities.splice(0, activities.length - 100);
  }
  
  localStorage.setItem('tanktools_activities', JSON.stringify(activities));
  
  console.log('تم تسجيل النشاط:', activity);
}

// تهيئة نظام الصلاحيات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  // فحص الصلاحيات
  if (!checkPageAccess()) {
    return;
  }
  
  // تسجيل دخول المستخدم للصفحة
  logUserActivity('page_visit', getCurrentPageName());
  
  console.log('🔐 نظام الصلاحيات تم تحميله بنجاح');
});

// تصدير الوظائف للاستخدام العام
window.TankToolsPermissions = {
  getCurrentUser,
  checkPageAccess,
  hasPermission,
  logUserActivity,
  redirectToLogin,
  USER_TYPES
};


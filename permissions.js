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
  const userData = localStorage.getItem('tanktools_user');
  if (!userData) {
    return null;
  }
  try {
    return JSON.parse(userData);
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
  if (user.userType === 'admin' || user.isAdmin) {
    return true;
  }

  // فحص الصفحات المسموحة
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
  localStorage.removeItem('tanktools_user');
  window.location.href = 'login.html';
}

// فحص صلاحية وظيفة معينة
function hasPermission(permissionName) {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (user.userType === 'admin' || user.isAdmin) return true;
  
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


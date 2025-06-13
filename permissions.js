/**
 * Tank Tools - نظام إدارة الصلاحيات
 * Developer: Fahad - 17877
 * Version: 1.0
 */

// تعريف التخصصات والصلاحيات الافتراضية
const SPECIALIZATIONS = {
  supervisor: {
    name: 'Supervisor',
    nameAr: 'مشرف',
    defaultPages: ['index.html', 'plcr.html', 'NMOGASBL.html', 'dashboard.html'],
    defaultPermissions: {
      canViewLiveTanks: true,
      canEditLiveTanks: false,  // مشاهدة فقط في Live Tanks
      canAddToLiveTanks: false, // لا يقدر يضيف للـ Live Tanks
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  planning: {
    name: 'Planning',
    nameAr: 'تخطيط',
    defaultPages: ['index.html', 'plcr.html', 'NMOGASBL.html', 'dashboard.html'],
    defaultPermissions: {
      canViewLiveTanks: false,  // لا يشوف Live Tanks أصلاً
      canEditLiveTanks: false,
      canAddToLiveTanks: false, // لا يقدر يضيف للـ Live Tanks
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  control_panel: {
    name: 'Control Panel',
    nameAr: 'غرفة التحكم',
    defaultPages: ['live-tanks.html', 'dashboard.html'],
    defaultPermissions: {
      canViewLiveTanks: true,
      canEditLiveTanks: true,   // يقدر يعدل في Live Tanks
      canAddToLiveTanks: true,  // يقدر يضيف للـ Live Tanks
      canDeleteFromLiveTanks: true,
      canManageUsers: false
    }
  },
  field_operator: {
    name: 'Field Operator',
    nameAr: 'مشغل ميداني',
    defaultPages: ['dashboard.html'],
    defaultPermissions: {
      canViewLiveTanks: false,
      canEditLiveTanks: false,
      canAddToLiveTanks: false,
      canDeleteFromLiveTanks: false,
      canManageUsers: false
    }
  },
  admin: {
    name: 'Administrator',
    nameAr: 'مدير النظام',
    defaultPages: ['all'],
    defaultPermissions: {
      canViewLiveTanks: true,
      canEditLiveTanks: true,
      canAddToLiveTanks: true,
      canDeleteFromLiveTanks: true,
      canManageUsers: true
    }
  }
};

// تعريف مستويات الصلاحيات لكل صفحة
const PAGE_PERMISSIONS = {
  'index.html': ['view', 'edit', 'delete'],
  'plcr.html': ['view', 'edit', 'delete'],
  'NMOGASBL.html': ['view', 'edit', 'delete'],
  'live-tanks.html': ['view', 'edit', 'delete'],
  'dashboard.html': ['view'],
  'verify.html': ['view', 'edit']
};

// أسماء الصفحات بالعربية
const PAGE_NAMES = {
  'index.html': 'PBCR',
  'plcr.html': 'PLCR', 
  'NMOGASBL.html': 'NMOGAS',
  'live-tanks.html': 'Live Tanks',
  'dashboard.html': 'Dashboard',
  'verify.html': 'Verification'
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
  if (user.specialization === 'admin' || user.isAdmin || user.role === 'admin') {
    return true;
  }

  // إذا كان المستخدم يستخدم النظام القديم (role بدلاً من specialization)
  if (user.role && !user.specialization) {
    // السماح للمستخدمين القدامى بالوصول للصفحات الأساسية
    const allowedPagesForOldUsers = ['index.html', 'plcr.html', 'NMOGASBL.html', 'dashboard.html', 'live-tanks.html'];
    return allowedPagesForOldUsers.includes(pageName);
  }

  // للمستخدمين الجدد مع نظام specialization
  if (user.customPages && Array.isArray(user.customPages)) {
    // إذا كان للمستخدم صفحات مخصصة
    return user.customPages.includes(pageName) || user.customPages.includes('all');
  }

  // استخدام الصفحات الافتراضية للتخصص
  const specialization = SPECIALIZATIONS[user.specialization];
  if (!specialization) {
    console.error('تخصص غير معروف:', user.specialization);
    return false;
  }

  // إذا كان المستخدم له صلاحية "all"
  if (specialization.defaultPages.includes('all')) {
    return true;
  }

  // فحص الصفحة المحددة
  return specialization.defaultPages.includes(pageName);
}

// تطبيق صلاحيات الوظائف على الصفحة
function applyFeaturePermissions(user) {
  // إذا كان المستخدم يستخدم النظام القديم
  if (user.role && !user.specialization) {
    // تطبيق الصلاحيات الافتراضية للنظام القديم
    const isAdmin = user.role === 'admin' || user.isAdmin;
    const canAccessLiveTanks = ['admin', 'panel_operator', 'supervisor'].includes(user.role);
    const canEditLiveTanks = ['admin', 'panel_operator'].includes(user.role);
    
    hideElementIfNoPermission('live-tanks-btn', canAccessLiveTanks);
    hideElementIfNoPermission('add-to-live-tanks-btn', canEditLiveTanks);
    hideElementIfNoPermission('add-to-live-tanks-help', canEditLiveTanks); // إخفاء علامة التعجب
    hideElementIfNoPermission('user-management-link', isAdmin);
    hideElementIfNoPermission('nav-admin', isAdmin);
    return;
  }

  // للمستخدمين الجدد مع نظام specialization
  let permissions = {};
  
  // إذا كان للمستخدم صلاحيات مخصصة
  if (user.customPermissions) {
    permissions = user.customPermissions;
  } else {
    // استخدام الصلاحيات الافتراضية للتخصص
    const specialization = SPECIALIZATIONS[user.specialization];
    permissions = specialization ? specialization.defaultPermissions : {};
  }

  // إخفاء أزرار Live Tanks حسب الصلاحيات
  hideElementIfNoPermission('live-tanks-btn', permissions.canViewLiveTanks);
  hideElementIfNoPermission('add-to-live-tanks-btn', permissions.canAddToLiveTanks);
  hideElementIfNoPermission('add-to-live-tanks-help', permissions.canAddToLiveTanks); // إخفاء علامة التعجب
  hideElementIfNoPermission('edit-live-tanks-btn', permissions.canEditLiveTanks);
  hideElementIfNoPermission('delete-live-tanks-btn', permissions.canDeleteFromLiveTanks);
  
  // إخفاء رابط إدارة المستخدمين
  hideElementIfNoPermission('user-management-link', permissions.canManageUsers);
  hideElementIfNoPermission('nav-admin', permissions.canManageUsers);

  // تطبيق صلاحيات على الروابط في القائمة العلوية
  applyNavigationPermissions(user);
  
  // تطبيق صلاحيات على صفحة Live Tanks إذا كنا فيها
  if (getCurrentPageName() === 'live-tanks.html') {
    applyLiveTanksPermissions(permissions);
  }
}

// تطبيق صلاحيات على صفحة Live Tanks
function applyLiveTanksPermissions(permissions) {
  // إخفاء أزرار التعديل والحذف إذا لم تكن هناك صلاحية
  const editButtons = document.querySelectorAll('.edit-btn, .update-btn, .save-btn');
  const deleteButtons = document.querySelectorAll('.delete-btn, .remove-btn');
  const addButtons = document.querySelectorAll('.add-btn, .create-btn');
  
  if (!permissions.canEditLiveTanks) {
    editButtons.forEach(btn => btn.style.display = 'none');
    // تعطيل الحقول القابلة للتعديل
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.readOnly) {
        input.readOnly = true;
        input.style.backgroundColor = '#f5f5f5';
        input.style.cursor = 'not-allowed';
      }
    });
  }
  
  if (!permissions.canDeleteFromLiveTanks) {
    deleteButtons.forEach(btn => btn.style.display = 'none');
  }
  
  if (!permissions.canAddToLiveTanks) {
    addButtons.forEach(btn => btn.style.display = 'none');
  }
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
  if (user.specialization === 'admin' || user.isAdmin || user.role === 'admin') return true;
  
  // إذا كان المستخدم يستخدم النظام القديم
  if (user.role && !user.specialization) {
    // صلاحيات افتراضية للنظام القديم
    switch (permissionName) {
      case 'canManageUsers':
        return user.role === 'admin' || user.isAdmin;
      case 'canViewLiveTanks':
        return ['admin', 'panel_operator', 'supervisor'].includes(user.role);
      case 'canEditLiveTanks':
      case 'canAddToLiveTanks':
      case 'canDeleteFromLiveTanks':
        return ['admin', 'panel_operator'].includes(user.role);
      default:
        return false;
    }
  }
  
  // للمستخدمين الجدد مع نظام specialization
  let permissions = {};
  
  if (user.customPermissions) {
    permissions = user.customPermissions;
  } else {
    const specialization = SPECIALIZATIONS[user.specialization];
    permissions = specialization ? specialization.defaultPermissions : {};
  }
  
  return permissions[permissionName] || false;
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
  SPECIALIZATIONS,
  PAGE_PERMISSIONS,
  PAGE_NAMES,
  applyLiveTanksPermissions
};


// Enhanced Permissions System for Tank Tools
// Integrates with Firebase for centralized user management

class PermissionsManager {
  constructor() {
    this.currentUser = null;
    this.userPermissions = null;
    this.defaultPermissions = {
      pages: {
        pbcr: false,
        plcr: false,
        nmogas: false,
        liveTanks: false,
        dashboard: false,
        admin: false
      },
      data: {
        viewCapacityFactors: false,
        viewMinMaxLevels: false,
        viewCalculations: true,
        editTanks: false,
        deleteTanks: false
      },
      tanks: {
        pbcr: [],
        plcr: [],
        nmogas: [],
        departments: []
      },
      actions: {
        addToLiveTanks: false,
        addReminders: true,
        addToTable: true,
        exportData: false,
        viewReports: false
      },
      timeRestrictions: {
        enabled: false,
        startTime: "06:00",
        endTime: "18:00",
        allowedDays: [1,2,3,4,5] // Monday to Friday
      }
    };
  }

  async loadUserPermissions(username) {
    try {
      // Load from Firebase userPermissions collection
      const userDoc = await getDoc(doc(db, 'userPermissions', username));
      if (userDoc.exists()) {
        this.userPermissions = userDoc.data();
        console.log('✅ User permissions loaded from Firebase');
        return true;
      } else {
        // Use default permissions for new users or if document doesn't exist
        this.userPermissions = { ...this.defaultPermissions };
        console.log('⚠️ Using default permissions for user:', username);
        // Optionally, create the userPermissions document if it doesn't exist
        // await setDoc(doc(db, 'userPermissions', username), this.defaultPermissions);
        return true;
      }
    } catch (error) {
      console.error('❌ Error loading user permissions:', error);
      this.userPermissions = { ...this.defaultPermissions };
      return false;
    }
  }

  hasPageAccess(page) {
    if (!this.userPermissions) return false;
    return this.userPermissions.pages[page] || false;
  }

  hasDataAccess(dataType) {
    if (!this.userPermissions) return false;
    return this.userPermissions.data[dataType] || false;
  }

  hasTankAccess(tankNumber, department) {
    if (!this.userPermissions) return false;
    
    // Check department access
    if (this.userPermissions.tanks.departments.length > 0) {
      if (!this.userPermissions.tanks.departments.includes(department)) {
        return false;
      }
    }
    
    // Check specific tank access
    const deptTanks = this.userPermissions.tanks[department.toLowerCase()] || [];
    if (deptTanks.length > 0) {
      return deptTanks.includes(tankNumber.toString());
    }
    
    return true; // Allow if no specific restrictions
  }

  hasActionAccess(action) {
    if (!this.userPermissions) return false;
    return this.userPermissions.actions[action] || false;
  }

  isWithinTimeRestrictions() {
    if (!this.userPermissions || !this.userPermissions.timeRestrictions.enabled) {
      return true;
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const restrictions = this.userPermissions.timeRestrictions;
    
    // Check allowed days
    if (!restrictions.allowedDays.includes(currentDay)) {
      return false;
    }
    
    // Check time range
    const startTime = this.parseTime(restrictions.startTime);
    const endTime = this.parseTime(restrictions.endTime);
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  filterTankData(tankData, department) {
    if (!this.userPermissions) return {};
    
    const filtered = {};
    
    for (const [tankNumber, data] of Object.entries(tankData)) {
      if (this.hasTankAccess(tankNumber, department)) {
        const filteredData = { ...data };
        
        // Hide sensitive data based on permissions
        if (!this.hasDataAccess('viewCapacityFactors')) {
          delete filteredData.capacity;
          delete filteredData.comment;
          delete filteredData.factor;
        }
        
        if (!this.hasDataAccess('viewMinMaxLevels')) {
          delete filteredData.min;
          delete filteredData.max;
          delete filteredData.gross;
        }
        
        filtered[tankNumber] = filteredData;
      }
    }
    
    return filtered;
  }

  applyUIRestrictions() {
    if (!this.userPermissions) return;
    
    // Hide/show navigation links
    const navLinks = {
      'pbcr': document.querySelector('a[href="index.html"]'),
      'plcr': document.querySelector('a[href="plcr.html"]'),
      'nmogas': document.querySelector('a[href="NMOGASBL.html"]'),
      'liveTanks': document.getElementById('liveTanksLink'),
      'dashboard': document.querySelector('a[href="dashboard.html"]'),
      'admin': document.getElementById('adminLink')
    };
    
    for (const [page, element] of Object.entries(navLinks)) {
      if (element) {
        element.style.display = this.hasPageAccess(page) ? 'inline-block' : 'none';
      }
    }
    
    // Hide/show action buttons
    const actionButtons = {
      'addToLiveTanks': document.getElementById('liveTanksBtn'),
      'addReminders': document.querySelector('.reminder-btn'),
      'addToTable': document.querySelector('.table-btn')
    };
    
    for (const [action, element] of Object.entries(actionButtons)) {
      if (element) {
        element.style.display = this.hasActionAccess(action) ? 'inline-flex' : 'none';
      }
    }
  }

  showAccessDeniedMessage(reason = 'insufficient_permissions') {
    const messages = {
      'insufficient_permissions': 'You do not have permission to access this feature.',
      'time_restriction': 'Access is restricted outside of allowed hours.',
      'tank_restriction': 'You do not have access to this tank.',
      'department_restriction': 'You do not have access to this department.'
    };
    
    alert('🔒 Access Denied\n\n' + messages[reason]);
  }

  logPermissionCheck(action, result, details = '') {
    console.log(`🔐 Permission Check: ${action} - ${result ? '✅ ALLOWED' : '❌ DENIED'}${details ? ' (' + details + ')' : ''}`);
  }
}

// Global permissions manager instance
window.permissionsManager = new PermissionsManager();

// Enhanced authentication check with permissions
async function checkUserPermissions() {
  const session = sessionStorage.getItem('tanktools_session');
  const userData = localStorage.getItem('tanktools_current_user');
  
  if (session !== 'active' || !userData) {
    return false;
  }
  
  try {
    const user = JSON.parse(userData);
    window.permissionsManager.currentUser = user;
    
    // Load user permissions from Firebase
    const permissionsLoaded = await window.permissionsManager.loadUserPermissions(user.username);
    if (!permissionsLoaded) {
      console.error('❌ Failed to load user permissions.');
      return false;
    }
    
    // Check time restrictions
    if (!window.permissionsManager.isWithinTimeRestrictions()) {
      window.permissionsManager.showAccessDeniedMessage('time_restriction');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking user permissions:', error);
    return false;
  }
}

// Page-specific permission check
function checkPageAccess(pageName) {
  if (!window.permissionsManager.hasPageAccess(pageName)) {
    window.permissionsManager.showAccessDeniedMessage('insufficient_permissions');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Tank access check
function checkTankAccess(tankNumber, department) {
  if (!window.permissionsManager.hasTankAccess(tankNumber, department)) {
    window.permissionsManager.showAccessDeniedMessage('tank_restriction');
    return false;
  }
  return true;
}

// Action permission check
function checkActionPermission(action) {
  if (!window.permissionsManager.hasActionAccess(action)) {
    window.permissionsManager.showAccessDeniedMessage('insufficient_permissions');
    return false;
  }
  return true;
}



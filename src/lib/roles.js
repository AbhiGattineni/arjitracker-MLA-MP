export const ROLES = {
  superadmin: {
    label: 'Super Admin',
    desc: 'Platform owner. Creates offices, invites office admins, can open any office.',
  },
  admin: {
    label: 'Admin',
    desc: 'MLA / MP. Full control of their office: team, roles, settings and all complaints.',
  },
  manager: {
    label: 'Manager',
    desc: 'PA / office manager. Sees all complaints, assigns them to employees, invites employees.',
  },
  employee: {
    label: 'Employee',
    desc: 'Office staff. Registers complaints; sees only complaints they created or are assigned to.',
  },
};

export const OFFICE_ROLES = ['admin', 'manager', 'employee'];

export const roleLabel = (r) => ROLES[r]?.label || r;

// Mirrors firestore.rules — the rules are the real enforcement, these only
// decide what the UI shows.
export const can = {
  seeAllComplaints: (r) => ['superadmin', 'admin', 'manager'].includes(r),
  assign: (r) => ['superadmin', 'admin', 'manager'].includes(r),
  editSettings: (r) => ['superadmin', 'admin'].includes(r),
  changeRoles: (r) => ['superadmin', 'admin'].includes(r),
  removeMember: (actor, target) =>
    actor === 'superadmin' || (actor === 'admin' && ['manager', 'employee'].includes(target)),
  invitableRoles: (r) =>
    ({
      superadmin: ['admin', 'manager', 'employee'],
      admin: ['manager', 'employee'],
      manager: ['employee'],
    })[r] || [],
};

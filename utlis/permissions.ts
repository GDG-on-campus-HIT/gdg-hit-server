/**
 * Single source of truth for what each role may do. Returned on /me and /login so
 * clients (admin panel) render by permission instead of hardcoding role names.
 * Keep in sync with the authorizeRoles(...) lists on the routes.
 */

const ADMIN = ["domain_lead", "super_domain_admin", "super_admin"];
const SUPER = ["super_domain_admin", "super_admin"];
const OWNER = ["super_admin"];

const PERMISSION_ROLES: Record<string, string[]> = {
  "dashboard.view": ADMIN,

  "members.read": ADMIN,
  "members.write": SUPER,

  "events.read": ADMIN,
  "events.write": SUPER,
  "events.registrations.manage": ADMIN,

  "recruitment.forms.manage": ADMIN,
  "recruitment.review": ADMIN,
  "recruitment.review.all_domains": SUPER,

  "certificates.manage": ADMIN,
  "id_cards.manage": ADMIN,

  "blogs.write": ADMIN,
  "blogs.moderate": SUPER,

  "users.read": SUPER,
  "messages.read": SUPER,
  "reviews.moderate": SUPER,
  "analytics.read": SUPER,
  "mail.promotion.send": SUPER,

  "admins.manage": OWNER,
  "activity_logs.read": OWNER,
};

export const getPermissionsForRole = (role?: string | null): string[] =>
  role
    ? Object.entries(PERMISSION_ROLES)
        .filter(([, roles]) => roles.includes(role))
        .map(([permission]) => permission)
    : [];

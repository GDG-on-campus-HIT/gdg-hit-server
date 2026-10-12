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
  "members.write": ADMIN,

  "events.read": ADMIN,
  "events.write": ADMIN,
  "events.registrations.manage": ADMIN,
  "events.check_in": ADMIN,

  "recruitment.forms.manage": ADMIN,
  "recruitment.review": ADMIN,
  // Domain leads review applicants for their assigned domains only
  "recruitment.review.all_domains": SUPER,

  "certificates.manage": ADMIN,
  "id_cards.manage": ADMIN,

  "blogs.write": ADMIN,
  "blogs.moderate": ADMIN,
  "testimonials.manage": ADMIN,

  "users.read": ADMIN,
  "messages.read": ADMIN,
  "reviews.moderate": ADMIN,
  "analytics.read": ADMIN,
  "mail.promotion.send": ADMIN,

  "admins.manage": OWNER,
  "activity_logs.read": OWNER,
};

export const getPermissionsForRole = (role?: string | null): string[] =>
  role
    ? Object.entries(PERMISSION_ROLES)
        .filter(([, roles]) => roles.includes(role))
        .map(([permission]) => permission)
    : [];

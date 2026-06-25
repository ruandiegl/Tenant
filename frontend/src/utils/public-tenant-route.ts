export const DEFAULT_PUBLIC_TENANT_SLUG = import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-burger";

const RESERVED_PUBLIC_SEGMENTS = new Set(["admin", "superadmin", "login", "invite", "cozinha", "cliente"]);

export function getPublicTenantSlug(pathname: string) {
  const [firstSegment = ""] = pathname.split("/").filter(Boolean);
  const slug = firstSegment.toLowerCase();

  if (!slug || RESERVED_PUBLIC_SEGMENTS.has(slug) || !/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }

  return slug;
}

export function publicTenantPath(slug: string | null | undefined, path = "") {
  const tenantSlug = slug || DEFAULT_PUBLIC_TENANT_SLUG;
  const suffix = path.startsWith("/") ? path : `/${path}`;

  return `/${tenantSlug}${suffix === "/" ? "" : suffix}`;
}

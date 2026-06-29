const tenantSlugAliases: Record<string, string> = {
  "demo-burguer": "demo-burger"
};

export function resolveTenantSlugAlias(slug: string) {
  return tenantSlugAliases[slug] ?? slug;
}

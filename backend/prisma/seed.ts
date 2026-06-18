import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  ["platform.tenants.read", "Ler tenants da plataforma", "platform"],
  ["platform.tenants.write", "Criar e alterar tenants", "platform"],
  ["tenant.users.read", "Ler usuarios do tenant", "users"],
  ["tenant.users.write", "Criar e alterar usuarios do tenant", "users"],
  ["tenant.branches.read", "Ler filiais", "branches"],
  ["tenant.branches.write", "Criar e alterar filiais", "branches"],
  ["tenant.menu.read", "Ler cardapio administrativo", "menu"],
  ["tenant.menu.write", "Criar e alterar cardapio", "menu"],
  ["tenant.orders.read", "Ler pedidos", "orders"],
  ["tenant.orders.write", "Alterar pedidos", "orders"],
  ["tenant.kitchen.read", "Ler fila da cozinha", "kitchen"],
  ["tenant.kitchen.write", "Atualizar fila da cozinha", "kitchen"],
  ["tenant.coupons.read", "Ler cupons", "coupons"],
  ["tenant.coupons.write", "Criar e alterar cupons", "coupons"],
  ["tenant.reports.read", "Ler relatorios", "reports"],
  ["tenant.audit.read", "Ler auditoria", "audit"]
] as const;

async function main() {
  for (const [key, description, module] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description, module },
      update: { description, module }
    });
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-burger" },
    create: {
      name: "Demo Burger",
      slug: "demo-burger",
      email: "contato@demo.local",
      status: "ACTIVE",
      settings: {
        create: {
          brandName: "Demo Burger",
          primaryColor: "#0f766e",
          allowGuestCheckout: true,
          autoAcceptOrders: false,
          defaultPreparationTime: 25,
          minimumOrderValue: new Prisma.Decimal(15)
        }
      }
    },
    update: { status: "ACTIVE" },
    include: { settings: true }
  });

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "admin" } },
    create: {
      tenantId: tenant.id,
      name: "admin",
      description: "Administrador do tenant e da plataforma local",
      isSystem: true
    },
    update: {}
  });

  const kitchenRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "kitchen" } },
    create: {
      tenantId: tenant.id,
      name: "kitchen",
      description: "Operador de cozinha",
      isSystem: true
    },
    update: {}
  });

  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      create: { roleId: adminRole.id, permissionId: permission.id },
      update: {}
    });
  }

  for (const key of ["tenant.orders.read", "tenant.kitchen.read", "tenant.kitchen.write"]) {
    const permission = allPermissions.find((item) => item.key === key)!;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: kitchenRole.id, permissionId: permission.id } },
      create: { roleId: kitchenRole.id, permissionId: permission.id },
      update: {}
    });
  }

  const branch = await prisma.branch.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "matriz" } },
    create: {
      tenant: { connect: { id: tenant.id } },
      name: "Matriz",
      slug: "matriz",
      phone: "+5511999999999",
      acceptsDelivery: true,
      acceptsPickup: true,
      address: {
        create: {
          tenantId: tenant.id,
          street: "Rua Demo",
          number: "100",
          district: "Centro",
          city: "Sao Paulo",
          state: "SP",
          postalCode: "01000-000"
        }
      }
    },
    update: {},
    include: { address: true }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    create: {
      name: "Admin Demo",
      email: "admin@demo.local",
      passwordHash: await bcrypt.hash("admin123", 10),
      status: "ACTIVE"
    },
    update: {
      passwordHash: await bcrypt.hash("admin123", 10),
      status: "ACTIVE"
    }
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: admin.id } },
    create: {
      tenantId: tenant.id,
      userId: admin.id,
      roleId: adminRole.id,
      branchId: branch.id,
      status: "ACTIVE"
    },
    update: { roleId: adminRole.id, branchId: branch.id, status: "ACTIVE" }
  });

  const category = await prisma.menuCategory.upsert({
    where: { id: "seed-category-burgers" },
    create: {
      id: "seed-category-burgers",
      tenantId: tenant.id,
      branchId: branch.id,
      name: "Burgers",
      description: "Classicos da casa",
      sortOrder: 1
    },
    update: { tenantId: tenant.id, branchId: branch.id }
  });

  const product = await prisma.product.upsert({
    where: { id: "seed-product-classic-burger" },
    create: {
      id: "seed-product-classic-burger",
      tenantId: tenant.id,
      categoryId: category.id,
      name: "Burger Classico",
      description: "Pao, carne, queijo e molho da casa",
      basePrice: new Prisma.Decimal(29.9),
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
      isFeatured: true,
      optionGroups: {
        create: {
          tenantId: tenant.id,
          name: "Adicionais",
          maxSelection: 3,
          options: {
            create: [
              { tenantId: tenant.id, name: "Queijo extra", price: new Prisma.Decimal(4.5) },
              { tenantId: tenant.id, name: "Bacon", price: new Prisma.Decimal(6) }
            ]
          }
        }
      }
    },
    update: {
      tenantId: tenant.id,
      categoryId: category.id,
      status: "ACTIVE"
    }
  });

  await prisma.productAvailability.upsert({
    where: { tenantId_productId_branchId: { tenantId: tenant.id, productId: product.id, branchId: branch.id } },
    create: {
      tenantId: tenant.id,
      productId: product.id,
      branchId: branch.id,
      isAvailable: true
    },
    update: { isAvailable: true }
  });

  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "BEMVINDO10" } },
    create: {
      tenantId: tenant.id,
      code: "BEMVINDO10",
      description: "10% de desconto no primeiro pedido",
      discountType: "PERCENTAGE",
      discountValue: new Prisma.Decimal(10),
      maxDiscountValue: new Prisma.Decimal(20)
    },
    update: {}
  });

  console.log("Seed completed");
  console.log("Login: admin@demo.local / admin123 / tenantSlug demo-burger");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

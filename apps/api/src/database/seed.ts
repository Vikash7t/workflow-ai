import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Starting Workflow AI database seed...");

  // Create default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@workflow-ai.local" },
    update: {},
    create: {
      name: "Engineering Admin",
      email: "admin@workflow-ai.local",
      emailVerified: true,
    },
  });

  // Create default Organization
  const org = await prisma.organization.upsert({
    where: { slug: "acme-engineering" },
    update: {},
    create: {
      name: "Acme Engineering",
      slug: "acme-engineering",
      members: {
        create: {
          userId: adminUser.id,
          role: "OWNER",
        },
      },
    },
  });

  // Create default Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "core-platform" },
    update: {},
    create: {
      name: "Core Platform",
      slug: "core-platform",
      organizationId: org.id,
      members: {
        create: {
          userId: adminUser.id,
          role: "ADMIN",
        },
      },
    },
  });

  // Create default Workflow Statuses
  const defaultStatuses = [
    { name: "Backlog", category: "BACKLOG", color: "#9CA3AF", position: 0 },
    { name: "Todo", category: "UNSTARTED", color: "#3B82F6", position: 1, isDefault: true },
    { name: "In Progress", category: "STARTED", color: "#F59E0B", position: 2 },
    { name: "In Review", category: "STARTED", color: "#8B5CF6", position: 3 },
    { name: "Done", category: "COMPLETED", color: "#10B981", position: 4 },
  ];

  for (const s of defaultStatuses) {
    await prisma.workflowStatus.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: s.name,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: s.name,
        category: s.category,
        color: s.color,
        position: s.position,
        isDefault: s.isDefault ?? false,
      },
    });
  }

  // Create default Project
  await prisma.project.upsert({
    where: {
      workspaceId_key: {
        workspaceId: workspace.id,
        key: "ENG",
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "Engineering Core",
      key: "ENG",
      description: "Core infrastructure and foundational microservices",
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`- Org: ${org.name} (${org.slug})`);
  console.log(`- Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`- User: ${adminUser.email}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});

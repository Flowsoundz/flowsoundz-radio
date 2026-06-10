import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// GET — fetch the label the current user manages
export async function GET(req: NextRequest) {
  void req;
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      labelManagers: {
        include: {
          label: {
            include: {
              artists: {
                include: {
                  artist: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      songs: {
                        select: { queuePreferences: { select: { playCount: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.labelManagers.length === 0) return Response.json({ label: null });

  const lm = user.labelManagers[0]!;
  return Response.json({ label: lm.label, role: lm.role });
}

// POST — create a new label
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  let body: { name?: string; email?: string };
  try { body = (await req.json()) as typeof body; }
  catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? session.user.email ?? "").trim().toLowerCase();

  if (!name || name.length < 2) return Response.json({ error: "Label name required." }, { status: 422 });
  if (!email) return Response.json({ error: "Label email required." }, { status: 422 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return Response.json({ error: "User not found." }, { status: 404 });

  // Ensure this user doesn't already have a label
  const existing = await prisma.labelManager.findFirst({ where: { userId: user.id } });
  if (existing) return Response.json({ error: "You already manage a label." }, { status: 409 });

  let slug = slugify(name);
  const exists = await prisma.label.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const label = await prisma.label.create({
    data: {
      name,
      slug,
      email,
      managers: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  // Upgrade user role to LABEL_MANAGER
  await prisma.user.update({ where: { id: user.id }, data: { role: "LABEL_MANAGER" } });

  return Response.json({ label }, { status: 201 });
}

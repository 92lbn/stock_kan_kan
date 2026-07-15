"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { SocialPlatform, PostStatus } from "@/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/stock";

// ----- Boîte à idées -----

export async function createIdea(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Idée vide." };

  await db.contentIdea.create({ data: { text, authorId: admin.id } });
  revalidatePath("/reseaux");
  return undefined;
}

export async function deleteIdea(ideaId: string) {
  await requireAdmin();
  await db.contentIdea.delete({ where: { id: ideaId } });
  revalidatePath("/reseaux");
}

// ----- Calendrier éditorial -----

const PostSchema = z.object({
  platform: z.enum(SocialPlatform),
  caption: z.string().trim().optional(),
  scheduledAt: z.string().optional(),
  status: z.enum(PostStatus),
});

export async function createScheduledPost(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = PostSchema.safeParse({
    platform: formData.get("platform"),
    caption: formData.get("caption") || undefined,
    scheduledAt: formData.get("scheduledAt") || undefined,
    status: formData.get("status") || "SCHEDULED",
  });

  if (!parsed.success) {
    return { error: "Champs invalides." };
  }

  await db.scheduledPost.create({
    data: {
      platform: parsed.data.platform,
      caption: parsed.data.caption,
      status: parsed.data.status,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    },
  });

  revalidatePath("/reseaux");
  return undefined;
}

export async function deleteScheduledPost(postId: string) {
  await requireAdmin();
  await db.scheduledPost.delete({ where: { id: postId } });
  revalidatePath("/reseaux");
}

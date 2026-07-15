"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import type { ActionState } from "@/lib/actions/stock";

const NoteSchema = z.object({
  content: z.string().trim().min(1, { error: "Note vide." }),
  remindAt: z.string().optional(),
});

export async function createNote(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();

  const parsed = NoteSchema.safeParse({
    content: formData.get("content"),
    remindAt: formData.get("remindAt") || undefined,
  });

  if (!parsed.success) {
    return { error: "La note ne peut pas être vide." };
  }

  const remindAt = parsed.data.remindAt ? new Date(parsed.data.remindAt) : null;

  await db.note.create({
    data: {
      authorId: user.id,
      content: parsed.data.content,
      remindAt,
    },
  });

  revalidatePath("/notes");
  revalidatePath("/");
  return undefined;
}

export async function toggleNoteDone(noteId: string) {
  const user = await getCurrentUser();
  const note = await db.note.findFirst({ where: { id: noteId, authorId: user.id } });
  if (!note) return;
  await db.note.update({ where: { id: note.id }, data: { done: !note.done } });
  revalidatePath("/notes");
  revalidatePath("/");
}

export async function deleteNote(noteId: string) {
  const user = await getCurrentUser();
  const note = await db.note.findFirst({ where: { id: noteId, authorId: user.id } });
  if (!note) return;
  await db.note.delete({ where: { id: note.id } });
  revalidatePath("/notes");
  revalidatePath("/");
}

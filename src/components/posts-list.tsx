"use client";

import { useState } from "react";
import { deleteScheduledPost } from "@/lib/actions/social";
import { PostForm } from "@/components/post-form";
import { Badge } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { ConfirmAction } from "@/components/confirm-action";

export type PostVM = {
  id: string;
  platformLabel: string;
  color: string;
  dateLabel: string;
  status: string;
  statusLabel: string;
  caption: string;
};

export function PostsList({ posts }: { posts: PostVM[] }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-ink">Publications</h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-md border border-line-strong bg-card px-3 py-1.5 text-sm font-medium text-ink hover:bg-card-2"
        >
          + Planifier
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-8 text-center text-sm text-muted shadow-sm">
          Aucune publication planifiée.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ backgroundColor: p.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{p.platformLabel}</span>
                  <Badge variant={p.status === "PUBLISHED" ? "success" : "default"}>
                    {p.statusLabel}
                  </Badge>
                </span>
                {p.caption && <span className="block truncate text-xs text-muted">{p.caption}</span>}
              </span>
              <span className="num text-xs text-muted">{p.dateLabel}</span>
              <ConfirmAction
                action={deleteScheduledPost.bind(null, p.id)}
                title="Supprimer cette publication ?"
                message="La publication planifiée sera définitivement supprimée."
                triggerLabel="✕"
              />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Planifier une publication"
        className="fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl text-accent-ink shadow-lg transition-transform active:scale-95 sm:bottom-8"
      >
        +
      </button>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Planifier une publication">
        <div className="pb-2">
          <PostForm onDone={() => setAddOpen(false)} />
        </div>
      </Sheet>
    </div>
  );
}

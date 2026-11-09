"use client";

import { useRouter } from "next/navigation";

export function MarkRead({ id, read }: { id: string; read: boolean }) {
  const router = useRouter();
  return (
    <button className="hover:underline"
      onClick={async () => {
        await fetch(`/api/admin/submissions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: !read }) });
        router.refresh();
      }}>
      {read ? "Mark unread" : "Mark read"}
    </button>
  );
}

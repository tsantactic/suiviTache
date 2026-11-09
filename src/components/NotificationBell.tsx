"use client";
import { useEffect, useState } from "react";

type Notif = { id: string; type?: string; title: string; message: string; is_read: boolean; status: string; related_email?: string; created_at: string };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "history">("new");
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [msg, setMsg] = useState("");

  const fetchNotifs = async () => {
    try {
      const r = await fetch("/api/notifications");
      const j = await r.json();
      if (r.ok) { setItems(j.notifications || []); setUnread(j.unread || 0); }
    } catch {}
  };
  useEffect(() => { fetchNotifs(); const t = setInterval(fetchNotifs, 15000); return () => clearInterval(t); }, []);

  const markRead = async () => {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    fetchNotifs();
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) { setTab("new"); await markRead(); }
  };

  const act = async (kind: "approve"|"reject", n: Notif) => {
    setMsg("");
    const isProjectAccess = n.type === "project_access_request";
    const isSpaceAccess = n.type === "space_access_request";
    let url = `/api/users/${kind === "approve" ? "approve" : "reject"}`;
    let body: any = { notificationId: n.id, userId: null };
    if (isProjectAccess) {
      url = "/api/projects/access/respond";
      body = { notificationId: n.id, action: kind === "approve" ? "approved" : "rejected" };
    } else if (isSpaceAccess) {
      url = "/api/spaces/access/respond";
      body = { notificationId: n.id, action: kind === "approve" ? "approved" : "rejected" };
    }
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) setMsg("Erreur: " + (j.error || "inconnue"));
    else {
      if (isProjectAccess || isSpaceAccess) setMsg(kind === "approve" ? "Accès accepté" : "Accès refusé");
      else setMsg(kind === "approve" ? "Utilisateur approuvé" : "Utilisateur refusé");
      fetchNotifs();
    }
  };

  const newItems = items.filter((n) => !n.is_read || n.status === "pending");
  const shown = tab === "new" ? newItems : items;

  return (
    <div className="relative">
      <button onClick={toggle} aria-label="Notifications" className="relative p-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600">
        🔔
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center font-bold">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] max-h-[70vh] overflow-hidden flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm dark:text-white">Notifications</h3>
              <span className="text-xs text-slate-500">{unread} nouvelle(s)</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
              <button onClick={() => setTab("new")} className={`py-1.5 rounded-md text-xs font-medium ${tab === "new" ? "bg-white dark:bg-slate-700 dark:text-white shadow" : "text-slate-600 dark:text-slate-300"}`}>
                Notifications {newItems.length > 0 ? `(${newItems.length})` : ""}
              </button>
              <button onClick={() => setTab("history")} className={`py-1.5 rounded-md text-xs font-medium ${tab === "history" ? "bg-white dark:bg-slate-700 dark:text-white shadow" : "text-slate-600 dark:text-slate-300"}`}>
                Historique
              </button>
            </div>
            {msg && <p className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded">{msg}</p>}
          </div>
          <div className="overflow-y-auto p-3">
            {shown.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">{tab === "new" ? "Aucune nouvelle notification" : "Aucun historique"}</p>
            ) : shown.map((n) => (
              <div key={n.id} className={`mb-2 p-3 rounded-lg border ${n.is_read ? "border-slate-200 dark:border-slate-700" : "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"}`}>
                <p className="text-sm font-semibold dark:text-white">{n.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                <p className="text-[11px] text-slate-500 mt-1">Statut: {n.status} · {new Date(n.created_at).toLocaleString("fr-FR")}</p>
                {n.status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => act("approve", n)} className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">Accepter</button>
                    <button onClick={() => act("reject", n)} className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Refuser</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Database, CheckCircle, AlertCircle } from "lucide-react";

export function AdminPanel() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const seedDatabase = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/admin/seed`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Database seeded successfully!");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to seed database");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-neutral-900 border-4 border-neutral-700 shadow-2xl max-w-xs">
        <div className="p-4 bg-neutral-800 border-b-2 border-neutral-700">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-white" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Admin</h3>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={seedDatabase}
            disabled={status === "loading"}
            className="w-full bg-white hover:bg-neutral-200 disabled:bg-neutral-700 text-neutral-900 disabled:text-neutral-500 font-bold py-3 transition-colors text-sm mb-3"
          >
            {status === "loading" ? "Seeding..." : "Seed Database"}
          </button>

          {status === "success" && (
            <div className="flex items-center gap-2 bg-green-950 border-2 border-green-600 p-3 text-green-400 text-xs font-semibold">
              <CheckCircle className="w-4 h-4" />
              <p>{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 bg-red-950 border-2 border-red-600 p-3 text-red-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4" />
              <p>{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

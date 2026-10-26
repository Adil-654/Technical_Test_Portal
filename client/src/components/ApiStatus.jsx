
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, LoaderCircle } from "lucide-react";
import api from "../services/api";

export default function ApiStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    api
      .get("/health")
      .then(({ data }) => {
        if (active) {
          setStatus(data.success ? "connected" : "disconnected");
        }
      })
      .catch(() => {
        if (active) setStatus("disconnected");
      });

    return () => {
      active = false;
    };
  }, []);

  const config = {
    checking: {
      label: "Checking API...",
      icon: LoaderCircle,
      style: "bg-slate-100 text-slate-600",
    },
    connected: {
      label: "API connected",
      icon: CheckCircle2,
      style: "bg-emerald-50 text-emerald-700",
    },
    disconnected: {
      label: "API unavailable",
      icon: AlertCircle,
      style: "bg-rose-50 text-rose-700",
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${config.style}`}
    >
      <Icon
        size={15}
        className={status === "checking" ? "animate-spin" : ""}
      />
      {config.label}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Check,
  Filter,
  Bell,
  TrendingUp,
  Moon,
  Activity,
  Loader2,
  RefreshCw,
  AlertCircle,
  Zap,
} from "lucide-react";
import { onAuthChange } from "@/lib/firebase";
import { getAlerts, acknowledgeAlert, getPatients, getPatientData } from "@/lib/api";
import { generateRealtimeAlerts, type RiskAlert } from "@/lib/riskEvaluator";
import type { ClinicaAlert, Patient } from "@/types";

const alertTypeIcons: Record<ClinicaAlert["type"], typeof AlertTriangle> = {
  risk_increase: TrendingUp,
  social_isolation: Activity,
  sleep_disturbance: Moon,
  activity_decline: Activity,
  checkin_due: AlertTriangle,
  crisis_detected: AlertTriangle,
  sentiment_shift: TrendingUp,
};

const alertTypeLabels: Record<ClinicaAlert["type"], string> = {
  risk_increase: "Aumento de Risco",
  social_isolation: "Isolamento Social",
  sleep_disturbance: "Distúrbio de Sono",
  activity_decline: "Declínio de Atividade",
  checkin_due: "Check-in Pendente",
  crisis_detected: "Crise Detectada",
  sentiment_shift: "Mudança de Sentimento",
};

export default function AlertsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ClinicaAlert[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unacknowledged" | "local">("all");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [localAlerts, setLocalAlerts] = useState<RiskAlert[]>([]);

  const loadData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedAlerts, fetchedPatients] = await Promise.all([
        getAlerts(uid),
        getPatients(uid),
      ]);
      setAlerts(fetchedAlerts);
      // Build a lookup map for patient names
      const patientMap: Record<string, Patient> = {};
      for (const p of fetchedPatients) {
        patientMap[p.id] = p;
      }
      setPatients(patientMap);

      // Generate real-time client-side alerts from patient check-in data
      if (fetchedPatients.length > 0) {
        setRealtimeLoading(true);
        try {
          const realtime = await generateRealtimeAlerts(
            fetchedPatients,
            (pid, days) => getPatientData(pid, days)
          );
          setLocalAlerts(realtime);
        } catch (err) {
          console.warn("Failed to generate realtime alerts:", err);
        } finally {
          setRealtimeLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
      setError("Não foi possível carregar os alertas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth + initial load
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      const uid = user?.uid || null;
      setUserId(uid);
      if (uid) {
        loadData(uid);
      } else {
        setAlerts([]);
        setLocalAlerts([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      if (alertId.startsWith("local_")) {
        // Client-generated alert — just update local state
        setLocalAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
        );
      } else {
        // Firestore alert
        await acknowledgeAlert(alertId);
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
        );
      }
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    } finally {
      setAcknowledging(null);
    }
  };

  // Merge Firestore alerts with client-generated realtime alerts
  const allAlerts: Array<ClinicaAlert | RiskAlert> = [
    ...alerts,
    ...localAlerts.filter(
      (la) => !alerts.some((fa) => fa.id === la.id)
    ),
  ];

  const filteredAlerts =
    filter === "all"
      ? allAlerts
      : filter === "local"
      ? localAlerts
      : allAlerts.filter((a) => !a.acknowledged);

  const getSeverityBadge = (severity: ClinicaAlert["severity"]) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">Alto</Badge>;
      case "medium":
        return <Badge variant="warning">Médio</Badge>;
      case "low":
        return <Badge variant="secondary">Baixo</Badge>;
      default:
        return null;
    }
  };

  if (!userId) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Faça login para ver seus alertas.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">
        <Header
          title="Alertas"
          subtitle="Monitoramento de sinais de risco"
        />

        <div className="p-6 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => userId && loadData(userId)}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Filters + Refresh */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtrar:</span>
              </div>
              <Button
                variant={filter === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Todos ({allAlerts.length})
              </Button>
              <Button
                variant={filter === "unacknowledged" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilter("unacknowledged")}
              >
                <Bell className="w-4 h-4 mr-1" />
                Pendentes ({allAlerts.filter((a) => !a.acknowledged).length})
              </Button>
              <Button
                variant={filter === "local" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilter("local")}
              >
                <Zap className="w-4 h-4 mr-1" />
                Tempo Real ({localAlerts.filter((a) => !a.acknowledged).length})
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => userId && loadData(userId)}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>

          {/* Loading indicator for realtime alerts */}
          {realtimeLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span className="text-amber-700">
                Analisando dados dos pacientes em tempo real...
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">
                      {loading ? "—" : allAlerts.length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-destructive">
                      {loading
                        ? "—"
                        : allAlerts.filter((a) => !a.acknowledged).length}
                    </p>
                  </div>
                  <Bell className="w-8 h-8 text-destructive/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Risco Alto</p>
                    <p className="text-2xl font-bold text-destructive">
                      {loading
                        ? "—"
                        : allAlerts.filter((a) => a.severity === "high").length}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-destructive/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Real</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {realtimeLoading ? "—" : localAlerts.length}
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-amber-500/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert List */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Carregando alertas...
                    </p>
                  </div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                      <Bell className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      {filter === "all"
                        ? "Nenhum alerta encontrado"
                        : filter === "local"
                        ? "Nenhum alerta de tempo real"
                        : "Nenhum alerta pendente"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {filter === "all"
                        ? "Seus pacientes não geraram nenhum alerta ainda."
                        : filter === "local"
                        ? "Os alertas de tempo real aparecerão aqui conforme os dados são analisados."
                        : "Todos os alertas foram resolvidos. ✅"}
                    </p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const Icon = alertTypeIcons[alert.type] ?? AlertTriangle;
                    const typeLabel = alertTypeLabels[alert.type] ?? alert.type;
                    const patientName = patients[alert.patientId]?.name;
                    const isLocal = "isLocal" in alert && alert.isLocal === true;

                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border ${
                          alert.acknowledged
                            ? "bg-muted/50 opacity-60"
                            : alert.severity === "high"
                            ? "bg-destructive/5 border-destructive/20"
                            : "bg-card"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            alert.severity === "high"
                              ? "bg-destructive/10"
                              : alert.severity === "medium"
                              ? "bg-yellow-500/10"
                              : "bg-muted"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              alert.severity === "high"
                                ? "text-destructive"
                                : alert.severity === "medium"
                                ? "text-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">
                              {patientName || "Paciente"}
                            </span>
                            {isLocal && (
                              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                <Zap className="w-3 h-3" />
                                Tempo Real
                              </span>
                            )}
                            <Badge variant="outline">{typeLabel}</Badge>
                            {getSeverityBadge(alert.severity)}
                            {alert.acknowledged && (
                              <Badge variant="success">Resolvido</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                          {alert.recommendation && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              → {alert.recommendation}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.createdAt
                              ? new Date(alert.createdAt).toLocaleString(
                                  "pt-BR",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : "Data desconhecida"}
                          </p>
                        </div>

                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledging === alert.id}
                            className="gap-1 flex-shrink-0"
                          >
                            {acknowledging === alert.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Resolver
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

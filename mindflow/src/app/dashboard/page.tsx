"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivityChart, SleepChart } from "@/components/charts";
import { Users, AlertTriangle, TrendingUp, Clock, Loader2 } from "lucide-react";
import { onAuthChange } from "@/lib/firebase";
import { getPatients, getAlerts, getPatientData } from "@/lib/api";
import type { Patient, ClinicaAlert, DailyData } from "@/types";

interface ActivityDataPoint {
  date: string;
  activity: number;
  sleep: number;
}

function generateMockActivityData(days: number = 14): ActivityDataPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toISOString().split("T")[0],
      activity: Math.round(40 + Math.random() * 60),
      sleep: Math.round(5 + Math.random() * 4),
    };
  });
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<ClinicaAlert[]>([]);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load real Firestore data when user is authenticated
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      const uid = firebaseUser?.uid || null;
      setUserId(uid);

      if (!uid) {
        setPatients([]);
        setAlerts([]);
        setActivityData(generateMockActivityData());
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch patients assigned to this psychologist
        const [fetchedPatients, fetchedAlerts] = await Promise.all([
          getPatients(uid),
          getAlerts(uid),
        ]);

        if (!isMounted) return;

        setPatients(fetchedPatients);
        setAlerts(fetchedAlerts);

        // Build activity chart from check-in data (aggregate across all patients)
        if (fetchedPatients.length > 0) {
          const allDailyData: DailyData[] = [];
          // Fetch last 14 days for each patient (parallel, limit to 3 for performance)
          const patientIds = fetchedPatients.slice(0, 3).map(p => p.id);
          const dailyDataResults = await Promise.allSettled(
            patientIds.map(pid => getPatientData(pid, 14))
          );

          for (const result of dailyDataResults) {
            if (result.status === "fulfilled") {
              allDailyData.push(...result.value);
            }
          }

          if (allDailyData.length > 0) {
            // Aggregate by date
            const dateMap = new Map<string, { activitySum: number; sleepSum: number; count: number }>();
            for (const d of allDailyData) {
              const existing = dateMap.get(d.date) || { activitySum: 0, sleepSum: 0, count: 0 };
              existing.activitySum += d.features.physicalActivity;
              existing.sleepSum += d.features.sleepDuration;
              existing.count += 1;
              dateMap.set(d.date, existing);
            }

            const aggregated: ActivityDataPoint[] = Array.from(dateMap.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-14)
              .map(([date, vals]) => ({
                date,
                activity: Math.round(vals.activitySum / vals.count),
                sleep: Math.round((vals.sleepSum / vals.count) * 10) / 10,
              }));

            setActivityData(aggregated.length >= 7 ? aggregated : generateMockActivityData());
          } else {
            setActivityData(generateMockActivityData());
          }
        } else {
          setActivityData(generateMockActivityData());
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        if (isMounted) {
          setError("Erro ao carregar dados. Mostrando dados de demonstração.");
          setActivityData(generateMockActivityData());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const activePatients = patients.filter((p) => p.status === "active" || p.status === "at_risk").length;
  const atRiskPatients = patients.filter((p) => p.riskLevel === "high").length;
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;

  // Compute trend from activity data
  const computeTrend = (data: ActivityDataPoint[]): string => {
    if (data.length < 7) return "Indisponível";
    const recent = data.slice(-3);
    const older = data.slice(-7, -3);
    if (older.length === 0) return "Estável";
    const recentAvg = recent.reduce((a, d) => a + d.activity, 0) / recent.length;
    const olderAvg = older.reduce((a, d) => a + d.activity, 0) / older.length;
    const diff = recentAvg - olderAvg;
    if (diff > 10) return "Melhorando ↑";
    if (diff < -10) return "Piorando ↓";
    return "Estável →";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">
        <Header
          title="Dashboard"
          subtitle={
            userId
              ? `Psicólogo ID: ${userId.slice(0, 8)}…`
              : "Visão geral dos seus pacientes"
          }
        />

        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Pacientes
                </CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patients.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activePatients} ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Em Risco Alto
                </CardTitle>
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {atRiskPatients}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requer atenção imediata
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Alertas Pendentes
                </CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unacknowledgedAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  Últimas 24 horas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Tendência Geral
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{computeTrend(activityData)}</div>
                <p className="text-xs text-muted-foreground">
                  vs. semana anterior
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Atividade Física</CardTitle>
                <CardDescription>Últimos 14 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityChart data={activityData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Qualidade do Sono</CardTitle>
                <CardDescription>Últimos 14 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <SleepChart
                  data={activityData.map((d) => ({
                    date: d.date,
                    hours: d.sleep,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          {/* Alerts and Patients */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Alertas Recentes</CardTitle>
                <CardDescription>Precisa de atenção</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum alerta pendente
                  </p>
                ) : (
                  alerts.slice(0, 5).map((alert) => {
                    const patient = patients.find((p) => p.id === alert.patientId);
                    return (
                      <div
                        key={alert.id}
                        className="flex items-start gap-4 p-3 rounded-lg border"
                      >
                        <AlertTriangle
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            alert.severity === "high"
                              ? "text-destructive"
                              : alert.severity === "medium"
                              ? "text-yellow-500"
                              : "text-blue-500"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {patient?.name || "Paciente Desconhecido"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.createdAt
                              ? new Date(alert.createdAt).toLocaleString("pt-BR")
                              : "Recente"}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* At Risk Patients */}
            <Card>
              <CardHeader>
                <CardTitle>Pacientes em Risco</CardTitle>
                <CardDescription>Monitoramento prioritário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {patients.filter((p) => p.riskLevel === "high").length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum paciente em risco alto
                  </p>
                ) : (
                  patients
                    .filter((p) => p.riskLevel === "high")
                    .map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center gap-4 p-3 rounded-lg border"
                      >
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-destructive">
                            {patient.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{patient.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Último acesso:{" "}
                            {patient.lastActive
                              ? new Date(patient.lastActive).toLocaleDateString("pt-BR")
                              : "N/A"}
                          </p>
                        </div>
                        <Badge variant="destructive">Alto Risco</Badge>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

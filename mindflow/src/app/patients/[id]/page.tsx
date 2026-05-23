"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Activity,
  Moon,
  Smile,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  Calendar,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Flame,
  Heart,
  Brain,
  Footprints,
  Users,
} from "lucide-react";
import { onAuthChange } from "@/lib/firebase";
import {
  getPatient,
  getPatientData,
  getPatientAlerts,
  acknowledgeAlert,
} from "@/lib/api";
import type { Patient, ClinicaAlert, DailyData } from "@/types";
import { ActivityChart, SleepChart, RiskGauge } from "@/components/charts";

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "stable";
  color: string;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}20` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
          {trend && (
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({
  alert,
  onAcknowledge,
}: {
  alert: ClinicaAlert;
  onAcknowledge: (id: string) => void;
}) {
  const severityColors = {
    low: "bg-yellow-50 border-yellow-200 text-yellow-800",
    medium: "bg-orange-50 border-orange-200 text-orange-800",
    high: "bg-red-50 border-red-200 text-red-800",
  };

  const typeLabels: Record<string, string> = {
    risk_increase: "Aumento de Risco",
    checkin_due: "Check-in Atrasado",
    crisis_detected: "Crise Detectada",
    sentiment_shift: "Mudança de Humor",
    sleep_disturbance: "Distúrbio de Sono",
    social_isolation: "Isolamento Social",
    activity_decline: "Redução de Atividade",
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${severityColors[alert.severity]} ${
        alert.acknowledged ? "opacity-60" : ""
      }`}
    >
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{typeLabels[alert.type] || alert.type}</span>
          <Badge
            variant={
              alert.severity === "high"
                ? "destructive"
                : alert.severity === "medium"
                ? "warning"
                : "secondary"
            }
            className="text-xs"
          >
            {alert.severity}
          </Badge>
          {alert.acknowledged && (
            <Badge variant="success" className="text-xs">
              ✓ Lida
            </Badge>
          )}
        </div>
        <p className="text-sm">{alert.message}</p>
        {alert.recommendation && (
          <p className="text-sm mt-1 font-medium opacity-80">
            → {alert.recommendation}
          </p>
        )}
        <p className="text-xs mt-2 opacity-60">
          {alert.createdAt
            ? new Date(alert.createdAt).toLocaleString("pt-BR")
            : "Data desconhecida"}
        </p>
      </div>
      {!alert.acknowledged && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAcknowledge(alert.id)}
          className="flex-shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

function getMoodTrend(data: DailyData[]): "up" | "down" | "stable" | undefined {
  if (data.length < 4) return undefined;
  const recent = data.slice(0, 3);
  const older = data.slice(3, 6);
  const recentAvg =
    recent.reduce((s, d) => s + (d.features.moodScore ?? 5), 0) / recent.length;
  const olderAvg =
    older.reduce((s, d) => s + (d.features.moodScore ?? 5), 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (diff > 0.5) return "up";
  if (diff < -0.5) return "down";
  return "stable";
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [alerts, setAlerts] = useState<ClinicaAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ackLoading, setAckLoading] = useState<string | null>(null);

  const loadData = useCallback(
    async (uid: string) => {
      setLoading(true);
      setError(null);
      try {
        const [patientData, daily, patientAlerts] = await Promise.all([
          getPatient(patientId),
          getPatientData(patientId, 30),
          getPatientAlerts(patientId, 20),
        ]);

        if (!patientData) {
          setError("Paciente não encontrado.");
          return;
        }
        if (patientData.therapistId !== uid) {
          setError("Acesso negado a este paciente.");
          return;
        }

        setPatient(patientData);
        setDailyData(daily);
        setAlerts(patientAlerts);
      } catch (err) {
        console.error("Failed to load patient data:", err);
        setError("Erro ao carregar dados do paciente.");
      } finally {
        setLoading(false);
      }
    },
    [patientId]
  );

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      const uid = user?.uid || null;
      setUserId(uid);
      if (uid) loadData(uid);
      else setLoading(false);
    });
    return unsubscribe;
  }, [loadData]);

  const handleAcknowledge = async (alertId: string) => {
    setAckLoading(alertId);
    try {
      await acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
      );
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    } finally {
      setAckLoading(null);
    }
  };

  // Compute averages from dailyData
  const recentData = dailyData.slice(0, 7);
  const avgMood =
    recentData.length > 0
      ? recentData.reduce((s, d) => s + (d.features.moodScore ?? 5), 0) /
        recentData.length
      : null;
  const avgSleep =
    recentData.length > 0
      ? recentData.reduce((s, d) => s + (d.features.sleepDuration ?? 0), 0) /
        recentData.length
      : null;
  const avgAnxiety =
    recentData.length > 0
      ? recentData.reduce((s, d) => s + (d.features.anxietyScore ?? 5), 0) /
        recentData.length
      : null;
  const avgActivity =
    recentData.length > 0
      ? recentData.reduce((s, d) => s + (d.features.physicalActivity ?? 0), 0) /
        recentData.length
      : null;
  const avgSocial =
    recentData.length > 0
      ? recentData.reduce(
          (s, d) => s + (d.features.socialInteractionScore ?? 5),
          0
        ) / recentData.length
      : null;

  // Chart data (most recent first → reverse for chart)
  const moodChartData = [...dailyData]
    .slice(0, 14)
    .reverse()
    .map((d) => ({
      date: d.date,
      activity: Math.round(d.features.moodScore ?? 5),
      sleep: Math.round(d.features.sleepDuration ?? 0),
    }));

  const sleepChartData = [...dailyData]
    .slice(0, 14)
    .reverse()
    .map((d) => ({
      date: d.date,
      hours: Math.round((d.features.sleepDuration ?? 0) * 10) / 10,
    }));

  // Consecutive checkins: count last consecutive days with data
  const consecutiveCheckins = (() => {
    let count = 0;
    for (const d of dailyData) {
      if (d.features.moodScore > 0) count++;
      else break;
    }
    return count;
  })();

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const riskScore = (() => {
    if (!patient) return 0;
    if (patient.riskLevel === "high") return 0.85;
    if (patient.riskLevel === "medium") return 0.5;
    return 0.15;
  })();

  if (!userId) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Faça login para ver detalhes.</p>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="text-muted-foreground">Carregando paciente...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-destructive">{error || "Paciente não encontrado."}</p>
            <Button asChild>
              <Link href="/patients">← Voltar aos Pacientes</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/patients">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{patient.name}</h2>
                <Badge
                  variant={
                    patient.riskLevel === "high"
                      ? "destructive"
                      : patient.riskLevel === "medium"
                      ? "warning"
                      : "success"
                  }
                >
                  Risco {patient.riskLevel === "high" ? "Alto" : patient.riskLevel === "medium" ? "Médio" : "Baixo"}
                </Badge>
                <Badge
                  variant={
                    patient.status === "active"
                      ? "success"
                      : patient.status === "at_risk"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {patient.status === "active"
                    ? "Ativo"
                    : patient.status === "at_risk"
                    ? "Em Risco"
                    : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {patient.email}
                  </span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {patient.phone}
                  </span>
                )}
                {patient.condition && (
                  <Badge variant="outline" className="text-xs">
                    {patient.condition}
                  </Badge>
                )}
                {patient.lastActive && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Última atividade:{" "}
                    {new Date(patient.lastActive).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(userId!)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Humor Médio"
              value={avgMood !== null ? `${avgMood.toFixed(1)}/10` : "—"}
              icon={Smile}
              trend={getMoodTrend(dailyData)}
              color="#8b5cf6"
            />
            <StatCard
              label="Sono Médio"
              value={avgSleep !== null ? `${avgSleep.toFixed(1)}h` : "—"}
              icon={Moon}
              color="#06b6d4"
            />
            <StatCard
              label="Check-ins Consec."
              value={consecutiveCheckins > 0 ? `${consecutiveCheckins} 🔥` : "—"}
              icon={Flame}
              color="#f59e0b"
            />
            <StatCard
              label="Ansiedade Média"
              value={avgAnxiety !== null ? `${avgAnxiety.toFixed(1)}/10` : "—"}
              icon={Brain}
              color="#ef4444"
            />
          </div>

          {/* Charts + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Mood Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smile className="w-5 h-5 text-purple-500" />
                  Humor nos Últimos 14 Dias
                </CardTitle>
                <CardDescription>
                  {dailyData.length > 0
                    ? `Baseado em ${dailyData.length} dia(s) de dados`
                    : "Sem dados de check-in ainda"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {moodChartData.length > 0 ? (
                  <ActivityChart data={moodChartData} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados suficientes para exibir o gráfico
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sleep Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-cyan-500" />
                  Sono nos Últimos 14 Dias
                </CardTitle>
                <CardDescription>
                  {avgSleep !== null
                    ? `Média: ${avgSleep.toFixed(1)}h por noite`
                    : "Sem dados de sono"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sleepChartData.length > 0 ? (
                  <SleepChart data={sleepChartData} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados suficientes para exibir o gráfico
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs: Check-ins | Alertas | Comportamento */}
          <Tabs defaultValue="checkins" className="space-y-4">
            <TabsList>
              <TabsTrigger value="checkins">
                Check-ins ({dailyData.length})
              </TabsTrigger>
              <TabsTrigger value="alerts">
                Alertas ({unacknowledgedAlerts.length})
                {unacknowledgedAlerts.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {unacknowledgedAlerts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="behavior">
                Comportamento
              </TabsTrigger>
            </TabsList>

            {/* Check-ins Tab */}
            <TabsContent value="checkins">
              {dailyData.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum check-in registrado ainda.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      O paciente precisa usar o app Kibo para registrar check-ins.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Check-ins</CardTitle>
                    <CardDescription>
                      Últimos {Math.min(dailyData.length, 30)} dias
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dailyData.slice(0, 30).map((d) => (
                      <div
                        key={d.id || d.date}
                        className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-24 text-sm font-medium">
                          {new Date(d.date).toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Smile
                            className="w-4 h-4"
                            style={{
                              color:
                                d.features.moodScore >= 7
                                  ? "#10b981"
                                  : d.features.moodScore >= 4
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          />
                          <span className="text-sm font-medium">
                            {d.features.moodScore?.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Moon className="w-4 h-4 text-cyan-500" />
                          <span className="text-sm">
                            {d.features.sleepDuration?.toFixed(1)}h
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Brain className="w-4 h-4 text-red-400" />
                          <span className="text-sm">
                            {d.features.anxietyScore?.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Footprints className="w-4 h-4 text-purple-500" />
                          <span className="text-sm">
                            {d.features.physicalActivity?.toFixed(0)}min
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Users className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            {d.features.socialInteractionScore?.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts">
              {alerts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-foreground font-medium">
                      Nenhum alerta para este paciente.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tudo dentro dos parâmetros esperados.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={handleAcknowledge}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Behavior Tab */}
            <TabsContent value="behavior">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Heart className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {avgMood !== null ? avgMood.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Humor (0-10)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Moon className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {avgSleep !== null ? avgSleep.toFixed(1) : "—"}h
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Sono por noite</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Brain className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {avgAnxiety !== null ? avgAnxiety.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Ansiedade (0-10)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Footprints className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {avgActivity !== null ? avgActivity.toFixed(0) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Minutos de atividade</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {avgSocial !== null ? avgSocial.toFixed(0) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Interação Social (0-100)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Activity className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{consecutiveCheckins}</p>
                    <p className="text-xs text-muted-foreground mt-1">Check-ins Seguidos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed behavior */}
              {dailyData.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Características Comportamentais</CardTitle>
                    <CardDescription>
                      Médias dos últimos {Math.min(dailyData.length, 7)} dias
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Tempo em Casa</p>
                        <p className="font-medium">
                          {dailyData.slice(0, 7).reduce((s, d) => s + (d.features.timeAtHome ?? 0), 0) /
                            Math.max(dailyData.slice(0, 7).length, 1)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Qualidade do Sono</p>
                        <p className="font-medium">
                          {(dailyData.slice(0, 7).reduce((s, d) => s + (d.features.sleepQuality ?? 0), 0) /
                            Math.max(dailyData.slice(0, 7).length, 1)).toFixed(0)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Ritmo Circadiano</p>
                        <p className="font-medium">
                          {(dailyData.slice(0, 7).reduce((s, d) => s + (d.features.rhythmStrength ?? 0), 0) /
                            Math.max(dailyData.slice(0, 7).length, 1) *
                            100).toFixed(0)}
                          %
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Passos</p>
                        <p className="font-medium">
                          {Math.round(
                            dailyData.slice(0, 7).reduce((s, d) => s + (d.features.stepCount ?? 0), 0) /
                              Math.max(dailyData.slice(0, 7).length, 1)
                          ).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

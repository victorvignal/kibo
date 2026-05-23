"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  RefreshCw,
  Loader2,
  Filter,
  Info,
  Activity,
  Moon,
  MessageSquare,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { onAuthChange } from "@/lib/firebase";
import { getPatients, getPatientData, getAlerts } from "@/lib/api";
import { predictRisk, getRiskColor, getRiskLabel, getRiskBgColor, RiskPrediction } from "@/lib/riskPredictor";
import type { Patient, ClinicaAlert, DailyData } from "@/types";

type RiskFilter = "all" | "high" | "medium" | "low";
type SortBy = "risk" | "name" | "trend";

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const colors = {
    low: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge className={`${colors[level]} border font-semibold`}>
      {level === "high" ? "🔴 Alto" : level === "medium" ? "🟡 Médio" : "🟢 Baixo"}
    </Badge>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-gray-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "improving" | "stable" | "worsening" }) {
  if (trend === "improving") return <TrendingUp className="w-4 h-4 text-green-600" />;
  if (trend === "worsening") return <TrendingDown className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

export default function RiskDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [riskPredictions, setRiskPredictions] = useState<Map<string, RiskPrediction>>(new Map());
  const [alerts, setAlerts] = useState<ClinicaAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("risk");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedPatients, fetchedAlerts] = await Promise.all([
        getPatients(uid),
        getAlerts(uid, 50),
      ]);

      setPatients(fetchedPatients);
      setAlerts(fetchedAlerts);

      // Predict risk for each patient
      const predictions = new Map<string, RiskPrediction>();
      for (const patient of fetchedPatients) {
        try {
          const data = await getPatientData(patient.id, 30);
          const prediction = predictRisk(patient.id, data, patient);
          predictions.set(patient.id, prediction);
        } catch (err) {
          console.warn(`Failed to get data for patient ${patient.id}:`, err);
          // Create a default prediction for patients without data
          predictions.set(patient.id, {
            patientId: patient.id,
            riskLevel: patient.riskLevel || "medium",
            confidenceScore: 0.3,
            riskFactors: [],
            protectiveFactors: [],
            predictionExplanation: "Dados insuficientes para análise detalhada.",
            trend: "stable",
            daysAtRisk: 0,
          });
        }
      }
      setRiskPredictions(predictions);
    } catch (err) {
      console.error("Failed to load risk dashboard data:", err);
      setError("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      const uid = user?.uid || null;
      setUserId(uid);
      if (uid) {
        loadData(uid);
      } else {
        setPatients([]);
        setRiskPredictions(new Map());
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  // Filter and sort patients
  const filteredPatients = patients
    .filter((p) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(query) && !p.email.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Risk filter
      const prediction = riskPredictions.get(p.id);
      if (riskFilter !== "all" && prediction?.riskLevel !== riskFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const predA = riskPredictions.get(a.id);
      const predB = riskPredictions.get(b.id);

      if (sortBy === "risk") {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        const riskA = predA?.riskLevel ? riskOrder[predA.riskLevel] : 2;
        const riskB = predB?.riskLevel ? riskOrder[predB.riskLevel] : 2;
        if (riskA !== riskB) return riskA - riskB;
        // Secondary sort by confidence (higher first)
        return (predB?.confidenceScore || 0) - (predA?.confidenceScore || 0);
      }
      if (sortBy === "trend") {
        const trendOrder = { worsening: 0, stable: 1, improving: 2 };
        const trendA = predA?.trend ? trendOrder[predA.trend] : 1;
        const trendB = predB?.trend ? trendOrder[predB.trend] : 1;
        return trendA - trendB;
      }
      // Sort by name
      return a.name.localeCompare(b.name);
    });

  // Statistics
  const stats = {
    total: patients.length,
    high: patients.filter((p) => riskPredictions.get(p.id)?.riskLevel === "high").length,
    medium: patients.filter((p) => riskPredictions.get(p.id)?.riskLevel === "medium").length,
    low: patients.filter((p) => riskPredictions.get(p.id)?.riskLevel === "low").length,
    worsening: patients.filter((p) => riskPredictions.get(p.id)?.trend === "worsening").length,
  };

  if (!userId) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Faça login para ver o dashboard de risco.</p>
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
          title="Dashboard de Risco"
          subtitle="Análise preditiva de risco para seus pacientes"
        />

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {error}
              <Button variant="ghost" size="sm" onClick={() => userId && loadData(userId)}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-red-700">Alto Risco</CardTitle>
                <XCircle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.high}</div>
                <p className="text-xs text-muted-foreground">Requer intervenção</p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-yellow-700">Médio Risco</CardTitle>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
                <p className="text-xs text-muted-foreground">Monitoramento reforçado</p>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Baixo Risco</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.low}</div>
                <p className="text-xs text-muted-foreground">Acompanhamento padrão</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Piorando</CardTitle>
                <TrendingDown className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.worsening}</div>
                <p className="text-xs text-muted-foreground">Tendência de piora</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar paciente..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-1">
                {(["all", "high", "medium", "low"] as RiskFilter[]).map((filter) => (
                  <Button
                    key={filter}
                    variant={riskFilter === filter ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setRiskFilter(filter)}
                    className={riskFilter === filter ? "font-semibold" : ""}
                  >
                    {filter === "all" ? "Todos" : filter === "high" ? "🔴 Alto" : filter === "medium" ? "🟡 Médio" : "🟢 Baixo"}
                  </Button>
                ))}
              </div>

              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="risk">Ordenar: Risco</option>
                <option value="name">Ordenar: Nome</option>
                <option value="trend">Ordenar: Tendência</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => userId && loadData(userId)}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Patient Cards */}
          {!loading && filteredPatients.length > 0 && (
            <div className="grid gap-4">
              {filteredPatients.map((patient) => {
                const prediction = riskPredictions.get(patient.id);
                if (!prediction) return null;

                return (
                  <Card
                    key={patient.id}
                    className="hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    style={{
                      borderLeftWidth: 4,
                      borderLeftColor: getRiskColor(prediction.riskLevel),
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        {/* Patient Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {patient.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{patient.name}</h3>
                              <p className="text-sm text-muted-foreground">{patient.email}</p>
                            </div>
                            <RiskBadge level={prediction.riskLevel} />
                            <div className="flex items-center gap-1">
                              <TrendIcon trend={prediction.trend} />
                              <span className="text-xs text-muted-foreground">
                                {prediction.trend === "improving" ? "Melhorando" : prediction.trend === "worsening" ? "Piorando" : "Estável"}
                              </span>
                            </div>
                          </div>

                          {/* Risk Explanation */}
                          <p className="text-sm text-muted-foreground mt-2">
                            💡 {prediction.predictionExplanation}
                          </p>

                          {/* Risk Factors */}
                          {prediction.riskFactors.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {prediction.riskFactors.slice(0, 3).map((factor, i) => (
                                <div
                                  key={i}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                    factor.severity === "severe"
                                      ? "bg-red-100 text-red-700"
                                      : factor.severity === "moderate"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {factor.type === "sleep" && <Moon className="w-3 h-3" />}
                                  {factor.type === "mood" && <Activity className="w-3 h-3" />}
                                  {factor.type === "social" && <MessageSquare className="w-3 h-3" />}
                                  {factor.type === "checkin_gap" && <AlertTriangle className="w-3 h-3" />}
                                  {factor.type === "anxiety" && <AlertTriangle className="w-3 h-3" />}
                                  {factor.type === "activity" && <Activity className="w-3 h-3" />}
                                  {factor.description}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Confidence Score */}
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Confiança</span>
                          </div>
                          <ConfidenceBar confidence={prediction.confidenceScore} />
                          <div className="text-xs text-muted-foreground mt-1">
                            {prediction.daysAtRisk > 0 && `${prediction.daysAtRisk} dias em risco`}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPatients.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Shield className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <span className="text-3xl">🛡️</span>
                </Shield>
                <p className="text-muted-foreground font-medium">
                  {searchQuery || riskFilter !== "all"
                    ? "Nenhum paciente encontrado com os filtros atuais"
                    : "Você ainda não tem pacientes cadastrados"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || riskFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Adicione pacientes para ver a análise de risco preditiva"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

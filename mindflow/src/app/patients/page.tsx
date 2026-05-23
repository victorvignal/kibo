"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  Activity,
  Moon,
  MessageSquare,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { onAuthChange } from "@/lib/firebase";
import { getPatients, createPatient, generateLinkingCode, getActiveLinkingCode, revokeLinkingCode, LinkingCode } from "@/lib/api";
import type { Patient } from "@/types";

export default function PatientsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string |null>(null);
  const [newPatient, setNewPatient] = useState({
    name: "",
    email: "",
    phone: "",
    condition: "depression" as Patient["condition"],
  });

  // Linking code state
  const [isLinkingDialogOpen, setIsLinkingDialogOpen] = useState(false);
  const [linkingCode, setLinkingCode] = useState<LinkingCode | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Load patients from Firestore
  const loadPatients = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getPatients(uid);
      setPatients(fetched);
    } catch (err) {
      console.error("Failed to load patients:", err);
      setError("Não foi possível carregar os pacientes. Tente novamente.");
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
        loadPatients(uid);
      } else {
        setPatients([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [loadPatients]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskBadge = (risk: Patient["riskLevel"]) => {
    switch (risk) {
      case "low":
        return <Badge variant="success">Baixo</Badge>;
      case "medium":
        return <Badge variant="warning">Médio</Badge>;
      case "high":
        return <Badge variant="destructive">Alto</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: Patient["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Ativo</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inativo</Badge>;
      case "at_risk":
        return <Badge variant="warning">Em Risco</Badge>;
      default:
        return null;
    }
  };

  const handleAddPatient = async () => {
    if (!userId) return;
    if (!newPatient.name.trim() || !newPatient.email.trim()) {
      setAddError("Nome e email são obrigatórios.");
      return;
    }

    setAddLoading(true);
    setAddError(null);

    try {
      const patientId = await createPatient(
        {
          name: newPatient.name.trim(),
          email: newPatient.email.trim(),
          phone: newPatient.phone.trim() || undefined,
          condition: newPatient.condition,
          status: "active",
          riskLevel: "low",
        },
        userId
      );

      // Reload patient list
      await loadPatients(userId);

      setIsAddDialogOpen(false);
      setNewPatient({ name: "", email: "", phone: "", condition: "depression" });
    } catch (err) {
      console.error("Failed to add patient:", err);
      setAddError("Não foi possível adicionar o paciente. Verifique se o email já está cadastrado.");
    } finally {
      setAddLoading(false);
    }
  };

  const openLinkingDialog = async () => {
    if (!userId) return;
    setCodeLoading(true);
    setCodeCopied(false);
    try {
      // Check for existing active code
      const existing = await getActiveLinkingCode(userId);
      if (existing) {
        setLinkingCode(existing);
      } else {
        const newCode = await generateLinkingCode(userId);
        setLinkingCode(newCode);
      }
    } catch (err) {
      console.error('Failed to generate linking code:', err);
    } finally {
      setCodeLoading(false);
      setIsLinkingDialogOpen(true);
    }
  };

  const handleCopyCode = () => {
    if (!linkingCode) return;
    navigator.clipboard.writeText(linkingCode.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleRevokeCode = async () => {
    if (!userId) return;
    setCodeLoading(true);
    try {
      await revokeLinkingCode(userId);
      setLinkingCode(null);
    } catch (err) {
      console.error('Failed to revoke code:', err);
    } finally {
      setCodeLoading(false);
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
              Faça login para ver seus pacientes.
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
        <Header title="Pacientes" subtitle="Gerencie seus pacientes" />

        <div className="p-6 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => userId && loadPatients(userId)}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome ou email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => userId && loadPatients(userId)}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Paciente
                </Button>
              </DialogTrigger>

              {/* Linking Code Dialog */}
              <Dialog open={isLinkingDialogOpen} onOpenChange={setIsLinkingDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={openLinkingDialog}>
                    🔗 Código de Vinculação
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Vincular Paciente ao App</DialogTitle>
                    <DialogDescription>
                      Gere um código para seu paciente conectar ao Kibo. O código expira em 24h.
                    </DialogDescription>
                  </DialogHeader>

                  {codeLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : linkingCode ? (
                    <div className="space-y-4 py-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Código de Vinculação</p>
                        <p className="text-4xl font-mono font-bold tracking-widest text-primary">
                          {linkingCode.code}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Para: <span className="font-medium">{linkingCode.psychologistName}</span>
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1 gap-2" onClick={handleCopyCode}>
                          {codeCopied ? '✅ Copiado!' : '📋 Copiar Código'}
                        </Button>
                        <Button variant="outline" onClick={handleRevokeCode}>
                          ✕
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        Compartilhe este código com seu paciente. Ele deve entrar no Kibo App → Perfil → Conectar ao Psicólogo.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Erro ao gerar código. Tente novamente.
                    </p>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLinkingDialogOpen(false)}>
                      Fechar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Paciente</DialogTitle>
                  <DialogDescription>
                    Adicione um paciente ao seu painel. Ele aparecerá no app Kibo ao fazer login.
                  </DialogDescription>
                </DialogHeader>

                {addError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {addError}
                  </div>
                )}

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo *</Label>
                    <Input
                      id="name"
                      value={newPatient.name}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, name: e.target.value })
                      }
                      placeholder="Nome do paciente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newPatient.email}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, email: e.target.value })
                      }
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={newPatient.phone}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, phone: e.target.value })
                      }
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condição principal</Label>
                    <select
                      id="condition"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={newPatient.condition}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          condition: e.target.value as Patient["condition"],
                        })
                      }
                    >
                      <option value="depression">Depressão</option>
                      <option value="anxiety">Ansiedade</option>
                      <option value="bipolar">Bipolar</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setAddError(null);
                    }}
                    disabled={addLoading}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPatient} disabled={addLoading}>
                    {addLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      "Adicionar"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-muted rounded" />
                        <div className="h-3 w-64 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Patient List */}
          {!loading && filteredPatients.length > 0 && (
            <div className="grid gap-4">
              {filteredPatients.map((patient) => (
                <Card
                  key={patient.id}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/patients/${patient.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-medium text-primary">
                          {patient.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{patient.name}</h3>
                          {getStatusBadge(patient.status)}
                          {getRiskBadge(patient.riskLevel)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {patient.email}
                          </span>
                          {patient.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {patient.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Desde{" "}
                            {patient.createdAt
                              ? new Date(patient.createdAt).toLocaleDateString("pt-BR", {
                                  month: "short",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Quick Stats from real data */}
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Atividade:</span>
                        <span className="font-medium">
                          {patient.status === "active"
                            ? "Normal"
                            : patient.status === "inactive"
                            ? "Reduzida"
                            : "Em atenção"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Moon className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Sono:</span>
                        <span className="font-medium">
                          {patient.riskLevel === "low"
                            ? "Regular"
                            : patient.riskLevel === "medium"
                            ? "Atenção"
                            : "Irregular"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Última vez:</span>
                        <span className="font-medium">
                          {patient.lastActive
                            ? `${Math.round(
                                (Date.now() - new Date(patient.lastActive).getTime()) /
                                  86400000
                              )}d atrás`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPatients.length === 0 && !error && (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <span className="text-3xl">👥</span>
                </div>
                <p className="text-muted-foreground font-medium">
                  {searchQuery
                    ? "Nenhum paciente encontrado na busca"
                    : "Você ainda não tem pacientes cadastrados"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Tente buscar por outro nome ou email"
                    : "Clique em 'Novo Paciente' para adicionar o primeiro"}
                </p>
                {!searchQuery && (
                  <Button
                    className="mt-2"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Paciente
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

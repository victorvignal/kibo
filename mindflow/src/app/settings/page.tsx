"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bell,
  Shield,
  Database,
  Moon,
  Sun,
  Smartphone,
  Mail,
} from "lucide-react";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    highRisk: true,
    mediumRisk: true,
    dailyReport: false,
    weeklyReport: true,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">
        <Header title="Configurações" subtitle="Gerencie sua conta e preferências" />

        <div className="p-6 max-w-3xl space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle>Perfil</CardTitle>
              </div>
              <CardDescription>
                Suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" defaultValue="Dr(a). Maria Silva" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="maria.silva@clinica.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic">Clínica/Instituição</Label>
                <Input id="clinic" defaultValue="Instituto de Psicologia USP" />
              </div>
              <Button>Salvar Alterações</Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Notificações</CardTitle>
              </div>
              <CardDescription>
                Configure como deseja receber alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Risco Alto</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando pacientes entrarem em risco alto
                  </p>
                </div>
                <Switch
                  checked={notifications.highRisk}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, highRisk: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Risco Médio</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando pacientes entrarem em risco médio
                  </p>
                </div>
                <Switch
                  checked={notifications.mediumRisk}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, mediumRisk: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatório Diário</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber resumo diário às 9h
                  </p>
                </div>
                <Switch
                  checked={notifications.dailyReport}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, dailyReport: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatório Semanal</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber resumo semanal aos domingos
                  </p>
                </div>
                <Switch
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, weeklyReport: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Privacidade e Dados</CardTitle>
              </div>
              <CardDescription>
                Como protegemos seus dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo Escuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar tema escuro
                  </p>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <Label>Exportar Dados</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Baixe todos os dados dos seus pacientes em formato CSV
                </p>
                <Button variant="outline">Exportar CSV</Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <Label>Dispositivos Conectados</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Gerencie os dispositivos com acesso à sua conta
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">iPhone 15 Pro</Badge>
                  <Badge variant="secondary">MacBook Pro</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <CardTitle>Compliance</CardTitle>
              </div>
              <CardDescription>
                Certificações e conformidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">LGPD Compliant</Badge>
                <Badge variant="success">Encryption AES-256</Badge>
                <Badge variant="success">GDPR Ready</Badge>
                <Badge variant="secondary">HIPAA Planning</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

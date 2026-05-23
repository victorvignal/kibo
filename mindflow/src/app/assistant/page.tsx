"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Brain, Calendar, Heart, MessageSquare, Moon, Activity, Sun, Coffee, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Message, ChatSession, CheckinQuestion, CheckinResponse } from "@/types";
import { cn } from "@/lib/utils";

// Mock data
const mockSessions: ChatSession[] = [
  {
    id: "1",
    patientId: "1",
    messages: [
      { id: "1", role: "assistant", content: "Olá! Como você está se sentindo hoje?", timestamp: new Date(Date.now() - 86400000), type: "checkin" },
      { id: "2", role: "user", content: "Estou me sentindo um pouco ansioso", timestamp: new Date(Date.now() - 86400000) },
      { id: "3", role: "assistant", content: "Entendo. Quer conversar sobre o que está causando essa ansiedade? Às vezes identificar o gatilho pode ajudar.", timestamp: new Date(Date.now() - 86400000) },
    ],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    lastInteraction: new Date(Date.now() - 86400000),
  },
  {
    id: "2",
    patientId: "2",
    messages: [
      { id: "1", role: "assistant", content: "Bom dia! Vou dar início ao seu check-in matinal.", timestamp: new Date(Date.now() - 172800000), type: "checkin" },
      { id: "2", role: "user", content: "Bom dia Kibo!", timestamp: new Date(Date.now() - 172800000) },
      { id: "3", role: "assistant", content: "Na escala de 1 a 10, como você avalia seu humor ao acordar?", timestamp: new Date(Date.now() - 172800000), type: "checkin" },
    ],
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
    lastInteraction: new Date(Date.now() - 172800000),
  },
];

const checkinQuestions: CheckinQuestion[] = [
  { id: "mood", question: "Como você está se sentindo agora?", type: "mood", scale: { min: 1, max: 10, labels: ["Muito mal", "Mal", "Regular", "Ok", "Bem"] } },
  { id: "sleep", question: "Como foi sua noite de sono?", type: "sleep", scale: { min: 1, max: 10, labels: ["Péssima", "Ruim", "Regular", "Boa", "Ótima"] } },
  { id: "anxiety", question: "Qual seu nível de ansiedade agora?", type: "mood", scale: { min: 1, max: 10, labels: ["Nenhuma", "Leve", "Moderada", "Alta", "Muito alta"] } },
  { id: "activity", question: "Você conseguiu fazer atividades hoje?", type: "activity", scale: { min: 1, max: 10, labels: ["Nenhuma", "Poucas", "Algumas", "Muitas", "Todas"] } },
  { id: "social", question: "Teve contato social hoje?", type: "social", scale: { min: 1, max: 5, labels: ["Nenhum", "Pouco", "Regular", "Bom", "Muito bom"] } },
  { id: "medication", question: "Tomou sua medicação hoje?", type: "medication" },
];

const kiboSystemPrompt = `Você é Kibo, um assistente de saúde mental com IA.

Sua persona:
- Você é um gato digital com aparência de gatoPersa cinza e branco, levemente mal-humorado mas muito prestativo
- Seu objetivo é ajudar pacientes com sua saúde mental através de monitoramento contínuo
- Você faz check-ins periódicos e identifica mudanças de comportamento
- Você fornece psicoeducação de forma acessível e empática
- Você detecta sinais de risco e alerta os profissionais de saúde

Suas funções:
1. Check-ins: Faça perguntas sobre humor, sono, atividade, medicação e socialização
2. Alertas: Se detectar sinais de risco, avise o psicólogo com urgência
3. Psicoeducação: Explique conceitos de saúde mental de forma simples
4. Suporte emocional: Ofereça apoio e validação das emoções do paciente
5. Registre tudo: Mantenha histórico para análise de padrões

Nunca forneça diagnósticos. Sempre oriente o paciente a buscar profissionais quando necessário.`;

export default function AssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(mockSessions);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [checkinStep, setCheckinStep] = useState(0);
  const [checkinResponses, setCheckinResponses] = useState<CheckinResponse[]>([]);
  const [activeTab, setActiveTab] = useState("chat");

  // Initialize or load session
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      setCurrentSession(sessions[0]);
    }
  }, [sessions, currentSession]);

  const handleSendMessage = async (content: string) => {
    if (!currentSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
      lastInteraction: new Date(),
      updatedAt: new Date(),
    };
    setCurrentSession(updatedSession);
    setSessions(sessions.map(s => s.id === updatedSession.id ? updatedSession : s));
    setIsLoading(true);

    // Simulate Kibo response
    setTimeout(() => {
      const response = generateKiboResponse(content, updatedSession);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        type: response.type,
        metadata: response.metadata,
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
      };
      setCurrentSession(finalSession);
      setSessions(sessions.map(s => s.id === finalSession.id ? finalSession : s));
      setIsLoading(false);
    }, 1500);
  };

  const generateKiboResponse = (userMessage: string, session: ChatSession): { content: string; type?: Message["type"]; metadata?: Message["metadata"] } => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for risk keywords
    if (lowerMessage.match(/suicídio|me matar|autolesão|cortar|cut|self harm/i)) {
      return {
        content: "⚠️ Parece que você está passando por um momento muito difícil. É importante que você procure ajuda profissional imediatamente. Você pode chamar o CVV no 188 ou ir ao pronto-socorro mais próximo. Sua vida é importante.",
        type: "alert",
        metadata: { riskLevel: "high" }
      };
    }

    if (lowerMessage.match(/ansiedade|ansioso|apavorado|perdido|medo|nervoso|stress/i)) {
      return {
        content: "Entendo que a ansiedade pode ser muito difícil. Vamos fazer um exercício de respiração juntos?\n\nInspire profundamente por 4 segundos, segure por 4 segundos, e expire por 6 segundos. Repita 3 vezes.\n\nAlém disso, gostaria de fazer um check-in rápido para entendermos melhor como você está?",
        type: "checkin"
      };
    }

    if (lowerMessage.match(/triste|tristeza|choro|desanimado|deprimido|dor|felicidade|sem vontade/i)) {
      return {
        content: "Agradeço por compartilhar isso comigo. Sentir tristeza é humano e válido.\n\nVocê gostaria de conversar mais sobre o que está sentindo? Às vezes colocar em palavras já ajuda. E lembre-se: você não precisa passar por isso sozinho(a).",
        type: "psicoeducation"
      };
    }

    if (lowerMessage.match(/não consigo|dormir|insônia|sono|noite|despertar/i)) {
      return {
        content: "Problemas com sono são muito comuns. Algumas dicas que podem ajudar:\n\n• Mantenha horários fixos para dormir e acordar\n• Evite telas 1h antes de dormir\n• Mantenha o quarto escuro e fresco\n• Evite cafeína à tarde\n\nQuer que eu crie um ritual noturno personalizado para você?",
        type: "psicoeducation"
      };
    }

    if (lowerMessage.match(/check-in|checkin|como estou|humor日报|como me sinto/i)) {
      const riskLevel = session.context?.currentRisk || "low";
      return {
        content: `📊 Seu resumo atual:\n\n• Nível de risco: ${riskLevel === "high" ? "⚠️ Alto" : riskLevel === "medium" ? "🟡 Moderado" : "🟢 Baixo"}\n• Último check-in: Há ${Math.round((Date.now() - (session.lastInteraction?.getTime() || Date.now())) / 86400000)} dias\n• Tendência: Estável\n\nVocê pode fazer um novo check-in agora para atualizarmos seu estado.`,
        type: "checkin"
      };
    }

    // Default empathetic responses
    const responses = [
      "Obrigado por compartilhar comigo. Quer me contar mais sobre isso?",
      "Entendo. Como isso tem afetado seu dia a dia?",
      "É muito corajoso conversar sobre isso. Estou aqui para ajudar.",
      "Vamos explorar isso mais um pouco. O que você gostaria de trabalhar?",
      "Sua saúde mental é importante. Como você está se sentindo sobre isso tudo?",
    ];

    return {
      content: responses[Math.floor(Math.random() * responses.length)]
    };
  };

  const handleStartCheckin = () => {
    setIsCheckinOpen(true);
    setCheckinStep(0);
    setCheckinResponses([]);
  };

  const handleCheckinAnswer = (questionId: string, answer: string | number) => {
    setCheckinResponses([...checkinResponses, { questionId, answer, timestamp: new Date() }]);
    
    if (checkinStep < checkinQuestions.length - 1) {
      setCheckinStep(checkinStep + 1);
    } else {
      // Finish checkin
      setTimeout(() => {
        const riskScore = calculateRiskScore(checkinResponses);
        const summary = generateCheckinSummary(checkinResponses, riskScore);
        
        if (currentSession) {
          const checkinComplete: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: summary,
            timestamp: new Date(),
            type: "checkin",
            metadata: { riskLevel: riskScore > 7 ? "high" : riskScore > 4 ? "medium" : "low" }
          };
          
          const updatedSession = {
            ...currentSession,
            messages: [...currentSession.messages, checkinComplete],
            lastInteraction: new Date(),
            updatedAt: new Date(),
            context: { ...currentSession.context, currentRisk: (riskScore > 7 ? "high" : riskScore > 4 ? "medium" : "low") as "low" | "medium" | "high" }
          };
          setCurrentSession(updatedSession);
          setSessions(sessions.map(s => s.id === updatedSession.id ? updatedSession : s));
        }
        
        setIsCheckinOpen(false);
      }, 500);
    }
  };

  const calculateRiskScore = (responses: CheckinResponse[]): number => {
    // Simple risk calculation based on mood/anxiety scores
    let score = 5; // Default medium
    responses.forEach(r => {
      if (r.questionId === "mood") score = 10 - Number(r.answer);
      if (r.questionId === "anxiety") score += Number(r.answer) / 2;
    });
    return Math.min(10, Math.max(0, Math.round(score)));
  };

  const generateCheckinSummary = (responses: CheckinResponse[], riskScore: number): string => {
    const mood = responses.find(r => r.questionId === "mood")?.answer || 5;
    const sleep = responses.find(r => r.questionId === "sleep")?.answer || 5;
    const anxiety = responses.find(r => r.questionId === "anxiety")?.answer || 5;
    
    let summary = `📋 Check-in Completo!\n\n`;
    summary += `• Humor: ${mood}/10\n`;
    summary += `• Sono: ${sleep}/10\n`;
    summary += `• Ansiedade: ${anxiety}/10\n\n`;
    
    if (riskScore > 7) {
      summary += `⚠️ Seu nível de risco está elevado. Recomendo que entre em contato com seu psicólogo em breve.`;
    } else if (riskScore > 4) {
      summary += `🟡 Seu nível está moderado. Continue fazendo as atividades que costumam ajudar.`;
    } else {
      summary += `🟢 Você está bem! Continue mantendo suas estratégias saudáveis.`;
    }
    
    return summary;
  };

  const currentQuestion = checkinQuestions[checkinStep];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header 
          title="Assistente Kibo" 
          subtitle="Seu companheiro de bem-estar mental"
        />

        <div className="flex-1 flex">
          {/* Sessions Sidebar */}
          <div className="w-80 border-r bg-muted/30 hidden lg:block">
            <div className="p-4 border-b">
              <Button className="w-full gap-2" onClick={handleStartCheckin}>
                <Coffee className="w-4 h-4" />
                Novo Check-in
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-2">Conversas Recentes</p>
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setCurrentSession(session)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg mb-1 transition-colors",
                      currentSession?.id === session.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <img src="/kibo-logo.png" alt="Kibo" className="w-6 h-6 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.patientId ? `Paciente ${session.patientId}` : "Nova conversa"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.messages[session.messages.length - 1]?.content.slice(0, 30) || "Sem mensagens"}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant={session.context?.currentRisk === "high" ? "destructive" : session.context?.currentRisk === "medium" ? "warning" : "success"}
                        className="text-xs"
                      >
                        {session.context?.currentRisk || "low"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {session.lastInteraction.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-background">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b px-4">
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="insights" className="gap-2">
                  <Brain className="w-4 h-4" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 m-0">
                <ChatInterface
                  messages={currentSession?.messages || []}
                  onSendMessage={handleSendMessage}
                  onStartCheckin={handleStartCheckin}
                  isLoading={isLoading}
                  showActions={true}
                />
              </TabsContent>

              <TabsContent value="insights" className="flex-1 m-0 p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                  <h2 className="text-2xl font-bold">Insights do Paciente</h2>
                  
                  {/* Risk Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-primary" />
                        Nível de Risco Atual
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold",
                          currentSession?.context?.currentRisk === "high" ? "bg-destructive/20 text-destructive" :
                          currentSession?.context?.currentRisk === "medium" ? "bg-yellow-500/20 text-yellow-500" :
                          "bg-green-500/20 text-green-500"
                        )}>
                          {currentSession?.context?.currentRisk === "high" ? "!" : 
                           currentSession?.context?.currentRisk === "medium" ? "~" : "✓"}
                        </div>
                        <div>
                          <p className="text-lg font-medium">
                            {currentSession?.context?.currentRisk === "high" ? "Risco Alto" :
                             currentSession?.context?.currentRisk === "medium" ? "Risco Moderado" : "Estável"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Baseado em check-ins e comportamento nos últimos 7 dias
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Tendência
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-green-500" />
                        <span className="text-green-500 font-medium">Melhorando</span>
                        <span className="text-muted-foreground">-15% risco em 7 dias</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Last Checkin */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Coffee className="w-5 h-5 text-primary" />
                        Último Check-in
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Há {Math.round((Date.now() - (currentSession?.lastInteraction?.getTime() || Date.now())) / 86400000)} dias
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="history" className="flex-1 m-0 p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                  <h2 className="text-2xl font-bold">Histórico de Check-ins</h2>
                  {checkinQuestions.map((q, i) => (
                    <Card key={q.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{q.question}</p>
                            <p className="text-sm text-muted-foreground">Dia {i + 1}</p>
                          </div>
                          <Badge variant="outline">{q.type}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Check-in Dialog */}
      <Dialog open={isCheckinOpen} onOpenChange={setIsCheckinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="/kibo-logo.png" alt="Kibo" className="w-6 h-6" />
              Check-in com Kibo
            </DialogTitle>
            <DialogDescription>
              Pergunta {checkinStep + 1} de {checkinQuestions.length}
            </DialogDescription>
          </DialogHeader>
          
          {currentQuestion.scale ? (
            <div className="py-4">
              <Label className="text-base mb-4 block">{currentQuestion.question}</Label>
              <div className="px-4">
                <Slider
                  defaultValue={[5]}
                  min={currentQuestion.scale.min}
                  max={currentQuestion.scale.max}
                  step={1}
                  onValueChange={(value) => handleCheckinAnswer(currentQuestion.id, value[0])}
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{currentQuestion.scale.labels?.[0]}</span>
                  <span>{currentQuestion.scale.labels?.[currentQuestion.scale.labels.length - 1]}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-2">
              <Label className="text-base">{currentQuestion.question}</Label>
              <div className="flex gap-2">
                <Button onClick={() => handleCheckinAnswer(currentQuestion.id, "Sim")} className="flex-1">Sim</Button>
                <Button onClick={() => handleCheckinAnswer(currentQuestion.id, "Não")} variant="outline" className="flex-1">Não</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

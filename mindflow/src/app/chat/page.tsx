"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Moon, Heart, Coffee, Calendar } from "lucide-react";
import type { Message } from "@/types";
import { onAuthChange } from "@/lib/firebase";

export default function ChatPage() {
  const [user, setUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser.uid);
        // Fetch user name from Firestore would go here
        setUserName("Você");
      }
    });
    return () => unsubscribe();
  }, []);

  // Initial greeting from Kibo
  useEffect(() => {
    if (user && messages.length === 0) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: `Olá! Sou o Kibo, seu assistente de bem-estar mental 🐱\n\nEstou aqui pra te ajudar no seu dia a dia. Posso:\n\n• Fazer check-ins contigo\n• Conversar sobre como você está se sentindo\n• Dar dicas de saúde mental\n• Alertar se detectar algo preocupante\n\nComo você está se sentindo hoje?`,
          timestamp: new Date(),
          type: "checkin"
        }
      ]);
    }
  }, [user, messages.length]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage]);
    setIsLoading(true);

    // Simulate Kibo response
    setTimeout(() => {
      const response = generateKiboResponse(content);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        type: response.type,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleStartCheckin = () => {
    const checkinMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `📋 Vamos fazer um check-in! Vou te fazer algumas perguntas rápidas.\n\n**Pergunta 1 de 5:**\n\nComo você está se sentindo agora? De 1 (muito mal) a 10 (muito bem).`,
      timestamp: new Date(),
      type: "checkin"
    };
    setMessages([...messages, checkinMessage]);
  };

  const generateKiboResponse = (userMessage: string): { content: string; type?: Message["type"] } => {
    const lower = userMessage.toLowerCase();
    
    // Risk detection
    if (lower.match(/suicídio|me matar|autolesão|cortar|self harm|querer morrer/i)) {
      return {
        content: `⚠️ Ei, parece que você está passando por um momento muito difícil. Isso é importante.\n\nVocê pode chamar o **CVV (188)** a qualquer hora, ou ir ao pronto-socorro mais próximo. Sua vida importa.\n\nEnquanto isso, estou aqui. Quer conversar mais?`,
        type: "alert"
      };
    }

    // Mood responses
    if (lower.match(/triste|tristeza|choro|desanimado|deprimido|dor|mal/i)) {
      return {
        content: `Entendo. Sentir tristeza é humano, e é importante validar o que você está sentindo. 💙\n\nQuer me contar mais sobre o que está acontecendo? Às vezes colocar em palavras já ajuda a aliviar.`
      };
    }

    if (lower.match(/ansioso|ansiedade|apavorado|nervoso|stress|preocupado/i)) {
      return {
        content: `A ansiedade pode ser bem difícil. Vamos fazer um exercício juntos? 🧘\n\n**Respiração 4-7-8:**\n• Inspire por 4 segundos\n• Segure por 7 segundos\n• Expire por 8 segundos\n\nRepita 3x e me diz como se sentiu.`
      };
    }

    if (lower.match(/feliz|contente|alegre|empolgado|grato|felicidade/i)) {
      return {
        content: `Que maravilha! 😊 Fico feliz por você. Guarda esse sentimento - anota num diário ou tirа print pra ver nos dias difíceis.`
      };
    }

    if (lower.match(/não consigo|dormir|insônia|sono|noite|despertar/i)) {
      return {
        content: `Problemas de sono são bem comuns. Algumas dicas:\n\n🌙 Horários fixos pra dormir e acordar\n📱 Sem telas 1h antes de dormir\n🧘 Relaxamento muscular progressivo antes de dormir\n\nQuer que eu monte uma rotina noturna pra você?`
      };
    }

    if (lower.match(/check-in|checkin|como estou|humor日报|como me sinto|vou bem/i)) {
      return {
        content: `Baseado no que você me contou, você está se sentindo ${Math.random() > 0.5 ? "estável" : "com algumas dificuldades"}. Isso é completamente normal.\n\nFazemos um check-in completo? É rapidinho e me ajuda a te conhecer melhor.`
      };
    }

    // Default
    const responses = [
      "Obrigado por compartilhar! Quer me contar mais?",
      "Estou ouvindo. Como isso te afeta no dia a dia?",
      "Isso é muito válido. Vamos conversar mais sobre.",
      "Sua saúde mental importa. Estou aqui pra você. 💙",
    ];
    return { content: responses[Math.floor(Math.random() * responses.length)] };
  };

  // Mock wellness data
  const wellnessData = {
    weeklyMood: 7.2,
    sleepQuality: 75,
    activityLevel: 60,
    socialScore: 45,
    streak: 5,
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with wellness data */}
      <div className="w-80 border-r bg-muted/20 p-4 hidden md:block">
        <div className="flex items-center gap-3 mb-6">
          <img src="/kibo-logo.png" alt="Kibo" className="w-10 h-10" />
          <div>
            <h2 className="font-bold">Kibo</h2>
            <p className="text-xs text-muted-foreground">Seu assistente 🐱</p>
          </div>
        </div>

        <Tabs defaultValue="wellness" className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="wellness" className="flex-1">Bem-estar</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
          </TabsList>
          
          <TabsContent value="wellness" className="space-y-4 mt-4">
            {/* Streak */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sequência</p>
                    <p className="text-2xl font-bold">{wellnessData.streak} dias 🔥</p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            {/* Mood Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Humor Semanal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{wellnessData.weeklyMood}/10</div>
                <Progress value={wellnessData.weeklyMood * 10} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">+0.5 vs semana passada</p>
              </CardContent>
            </Card>

            {/* Sleep */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Moon className="w-4 h-4 text-blue-500" />
                  Qualidade do Sono
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{wellnessData.sleepQuality}%</div>
                <Progress value={wellnessData.sleepQuality} className="h-2" />
              </CardContent>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  Nível de Atividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{wellnessData.activityLevel}%</div>
                <Progress value={wellnessData.activityLevel} className="h-2" />
              </CardContent>
            </Card>

            {/* Social */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  Interação Social
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{wellnessData.socialScore}%</div>
                <Progress value={wellnessData.socialScore} className="h-2" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Histórico de check-ins aparecerá aqui
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b bg-card">
          <img src="/kibo-logo.png" alt="Kibo" className="w-8 h-8" />
          <div className="flex-1">
            <h2 className="font-bold text-sm">Kibo</h2>
            <Badge variant="success" className="text-xs">Online</Badge>
          </div>
        </div>

        {/* Chat */}
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onStartCheckin={handleStartCheckin}
          isLoading={isLoading}
          showActions={true}
        />
      </div>
    </div>
  );
}

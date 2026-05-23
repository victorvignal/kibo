"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, User, AlertTriangle, Coffee, Activity, Moon } from "lucide-react";
import type { Message, MessageRole } from "@/types";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onStartCheckin?: () => void;
  isLoading?: boolean;
  compact?: boolean;
  showActions?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  onStartCheckin,
  isLoading = false,
  compact = false,
  showActions = true,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getMessageIcon = (msg: Message) => {
    if (msg.role === "user") return <User className="w-5 h-5" />;
    
    switch (msg.type) {
      case "alert":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "checkin":
        return <Coffee className="w-5 h-5 text-primary" />;
      case "psicoeducation":
        return <Activity className="w-5 h-5 text-green-500" />;
      default:
        return <Bot className="w-5 h-5 text-primary" />;
    }
  };

  const getMessageStyle = (msg: Message) => {
    if (msg.role === "user") {
      return "bg-primary text-primary-foreground";
    }
    
    switch (msg.type) {
      case "alert":
        return "bg-destructive/10 border border-destructive/30";
      case "checkin":
        return "bg-primary/10 border border-primary/30";
      case "psicoeducation":
        return "bg-green-500/10 border border-green-500/30";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className={cn("flex flex-col", compact ? "h-[400px]" : "h-[600px]")}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <img src="/kibo-logo.png" alt="Kibo" className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Olá! Sou o Kibo</p>
            <p className="text-sm max-w-md">
              Seu assistente de saúde mental. Como posso ajudar hoje?
            </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                msg.role === "user"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {getMessageIcon(msg)}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-3",
                getMessageStyle(msg)
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs opacity-60 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-3">
              <p className="text-muted-foreground">Kibo está digitando...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {showActions && messages.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onStartCheckin}
            className="gap-1"
          >
            <Coffee className="w-4 h-4" />
            Check-in
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSendMessage("Como está meu humor hoje?")}
            className="gap-1"
          >
            <Activity className="w-4 h-4" />
            Humor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSendMessage("Me dê dicas para melhorar o sono")}
            className="gap-1"
          >
            <Moon className="w-4 h-4" />
            Sono
          </Button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

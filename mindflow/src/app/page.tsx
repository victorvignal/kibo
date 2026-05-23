import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Smartphone, LineChart, Shield, Zap, Heart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img 
                src="/kibo-logo.png" 
                alt="Kibo" 
                className="w-10 h-10 rounded-full shadow-md" 
              />
              <div>
                <span className="font-display text-xl font-bold text-foreground">Kibo</span>
                <span className="text-xs text-muted-foreground block">bem-estar mental</span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="font-medium">Entrar</Button>
              </Link>
              <Link href="/register">
                <Button className="gap-2">
                  <Zap className="w-4 h-4" />
                  Começar
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Assistente com IA adaptativa
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
              Seu bem-estar mental,
              <br />
              <span className="gradient-text">inteligente e presente</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
              O Kibo é um assistente de IA que monitora seus padrões comportamentais,
              oferece suporte contínuo e ajuda você a entender melhor sua saúde mental.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 text-lg px-8 h-14">
                  <Zap className="w-5 h-5" />
                  Experimentar Gratuitamente
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="text-lg px-8 h-14">
                  Saiba mais
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Como o Kibo funciona
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tecnologia inteligente combinada com empatia para cuidar da sua mente
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Smartphone,
                title: "Coleta Passiva",
                description: "Dados de atividade, sono e socialização coletados automaticamente do seu celular.",
                color: "bg-violet-100 text-violet-600",
              },
              {
                icon: LineChart,
                title: "Análise Inteligente",
                description: "Padrões comportamentais analisados por IA para detectar mudanças significativas.",
                color: "bg-blue-100 text-blue-600",
              },
              {
                icon: MessageCircle,
                title: "Assistente Kibo",
                description: "Conversas adaptativas, check-ins personalizados e suporte 24 horas.",
                color: "bg-amber-100 text-amber-600",
              },
              {
                icon: Shield,
                title: "Alertas Precoces",
                description: "Identificação de sinais de risco antes que se tornem problemas maiores.",
                color: "bg-emerald-100 text-emerald-600",
              },
            ].map((feature, i) => (
              <Card 
                key={feature.title}
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="font-display text-lg">{feature.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-primary to-primary-dark rounded-3xl p-12 text-white max-w-5xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              {[
                { value: "70%", label: "Precisão na detecção" },
                { value: "2 sem", label: "Antecipação de crises" },
                { value: "100%", label: "Dados protegidos (LGPD)" },
                { value: "24/7", label: "Suporte contínuo" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto text-center p-12 border-2 border-primary/20">
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
              <img src="/kibo-logo.png" alt="Kibo" className="w-14 h-14 rounded-full" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Pronto para começar sua jornada?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              Junte-se a milhares de pessoas que já descobriram uma forma mais
              inteligente de cuidar da saúde mental.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2 text-lg px-10 h-14">
                <Heart className="w-5 h-5" />
                Criar Conta Gratuita
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/kibo-logo.png" alt="Kibo" className="w-8 h-8 rounded-full" />
              <div>
                <span className="font-display font-bold">Kibo</span>
                <span className="text-xs text-muted-foreground block">bem-estar mental</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Kibo. Dados protegidos pela LGPD.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

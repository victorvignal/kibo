import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TIPS = [
  'Com base no seu padrão de sono, estabelecer uma rotina de horários consistentes para dormir pode melhorar sua qualidade de sono em até 20%.',
  'Incorporar 30 minutos de atividade física moderada por dia pode reduzir significativamente os níveis de ansiedade.',
  'Manter conexões sociais ativas, mesmo que brevemente, contribui para uma sensação de bem-estar duradoura.',
  'Praticar mindfulness por apenas 10 minutos ao dia pode melhorar sua capacidade de gerenciar o estresse.',
  'A hidratação adequada e uma alimentação equilibrada influenciam diretamente seu humor e energia.',
];

export default function KiboTipCard() {
  const tip = useMemo(() => TIPS[new Date().getDay() % TIPS.length], []);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.emoji}>💡</Text>
        <Text style={styles.title}>Dica do Kibo</Text>
      </View>
      <Text style={styles.text}>{tip}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
  },
  text: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
});

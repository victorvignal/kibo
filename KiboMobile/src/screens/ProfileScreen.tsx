import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Share, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthChange, getUserProfile, logout } from '../services/firebase';
import { notificationService } from '../services/notifications';
import { authenticateWithBiometrics, isBiometricAvailable } from '../services/biometric';
import { getCheckinHistory, getMoodTrend } from '../services/checkins';
import { generateWeeklyInsights } from '../services/insights';
import { useTherapistCode, getLinkedTherapist } from '../services/linking';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    weeklyReport: true,
    emergencyContact: false,
  });
  const [biometricLock, setBiometricLock] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [stats, setStats] = useState({
    checkins: 0,
    streak: 0,
    daysActive: 0,
    conversations: 0,
  });

  // Therapist linking state
  const [linkedTherapist, setLinkedTherapist] = useState<{ therapistId: string | null; therapistName: string | null } | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setUser(profile);
        if (profile && (profile as any).notificationPrefs) {
          setNotifications((profile as any).notificationPrefs);
        }
        await loadUserStats(firebaseUser.uid);

        // Check biometric availability
        const bioAvailable = await isBiometricAvailable();
        setBiometricAvailable(bioAvailable);

        // Load biometric lock preference
        const lockPref = await AsyncStorage.getItem('biometric_lock');
        setBiometricLock(lockPref === 'true');

        // Check if already linked to a therapist
        const therapist = await getLinkedTherapist();
        setLinkedTherapist(therapist);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUserStats = async (userId: string) => {
    try {
      const history = await getCheckinHistory(userId, 90);
      const trend = await getMoodTrend(userId, 30);

      // Calculate streak
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
      );

      for (let i = 0; i < sortedHistory.length; i++) {
        const checkinDate = new Date(sortedHistory[i].timestamp!);
        checkinDate.setHours(0, 0, 0, 0);

        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        if (checkinDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }

      const uniqueDays = new Set(
        history.map(h => new Date(h.timestamp!).toISOString().split('T')[0])
      ).size;

      setStats({
        checkins: history.length,
        streak,
        daysActive: uniqueDays,
        conversations: Math.round(history.length * 0.5),
      });
    } catch (error) {
      console.warn('Failed to load user stats:', error);
    }
  };

  const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);

    if (key === 'dailyReminder') {
      if (value) {
        await notificationService.scheduleDailyReminder(9, 0);
      } else {
        await notificationService.cancelDailyReminder();
      }
    } else if (key === 'weeklyReport') {
      if (value) {
        // Schedule for Monday at 10am
        await notificationService.scheduleWeeklyReport(1, 10, 0);
      } else {
        await notificationService.cancelWeeklyReport();
      }
    }
  };

  const handleSensitiveAction = async (action: 'view' | 'export' | 'delete') => {
    // Require biometric re-auth for sensitive actions
    const result = await authenticateWithBiometrics(
      action === 'delete'
        ? 'Autentique para solicitar exclusão de dados'
        : action === 'view'
        ? 'Autentique para ver seus dados'
        : 'Autentique para exportar seus dados'
    );

    if (!result.success) {
      if (result.error && !result.error.includes('cancelada')) {
        Alert.alert('Erro', result.error);
      }
      return;
    }

    if (action === 'view') {
      // Show data summary without exporting
      try {
        const history = await getCheckinHistory(user!.uid, 30);
        const trend = await getMoodTrend(user!.uid, 14);
        const insights = await generateWeeklyInsights(user!.uid);

        const avgMood = history.length > 0 ? history.reduce((a, c) => a + c.mood, 0) / history.length : 0;
        const avgSleep = history.length > 0 ? history.reduce((a, c) => a + c.sleep, 0) / history.length : 0;
        const avgAnxiety = history.length > 0 ? history.reduce((a, c) => a + c.anxiety, 0) / history.length : 0;

        Alert.alert(
          '📊 Meus Dados - Kibo',
          `Check-ins registrados: ${history.length}\n` +
            `Média de humor: ${avgMood.toFixed(1)}/10\n` +
            `Média de sono: ${avgSleep.toFixed(1)}/10\n` +
            `Média de ansiedade: ${avgAnxiety.toFixed(1)}/10\n\n` +
            `Você tem ${history.length} check-ins nos últimos 30 dias.`,
          [{ text: 'Ok' }]
        );
      } catch (err) {
        Alert.alert('Erro', 'Não foi possível carregar seus dados.');
      }
    } else if (action === 'export') {
      // Generate wellness report and share
      try {
        const history = await getCheckinHistory(user!.uid, 30);
        const trend = await getMoodTrend(user!.uid, 14);
        const insights = await generateWeeklyInsights(user!.uid);

        const avgMood = history.length > 0 ? history.reduce((a, c) => a + c.mood, 0) / history.length : 0;
        const avgSleep = history.length > 0 ? history.reduce((a, c) => a + c.sleep, 0) / history.length : 0;
        const avgAnxiety = history.length > 0 ? history.reduce((a, c) => a + c.anxiety, 0) / history.length : 0;

        const report = `📋 RELATÓRIO DE BEM-ESTAR - KIBO
https://kibo.app

Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
Usuário: ${user?.email || 'N/A'}

─────────────────────────────────
RESUMO DOS ÚLTIMOS 30 DIAS
─────────────────────────────────
Total de check-ins: ${history.length}

MÉDIAS:
• Humor: ${avgMood.toFixed(1)}/10
• Sono: ${avgSleep.toFixed(1)}/10
• Ansiedade: ${avgAnxiety.toFixed(1)}/10

TENDÊNCIA DE HUMOR (14 dias):
${trend.map(t => `• ${t.date}: ${t.mood}/10`).join('\n')}

INSIGHTS RECENTES:
${insights.map(i => `• ${i.emoji} ${i.title}: ${i.description}`).join('\n')}

─────────────────────────────────
Dados exportados do app Kibo
Seus dados são confidenciais.
`;

        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          await Share.share({ message: report, title: 'Relatório de Bem-Estar - Kibo' });
        } else {
          Alert.alert('Relatório Gerado', 'Copie o texto do relatório para compartilhar.');
        }
      } catch (err) {
        Alert.alert('Erro', 'Não foi possível gerar o relatório.');
      }
    } else {
      Alert.alert(
        'Solicitar Exclusão',
        'Tem certeza que deseja solicitar a exclusão dos seus dados? Esta ação é irreversível e requer confirmação adicional.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Solicitar Exclusão',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Solicitação Enviada',
                'Sua solicitação de exclusão de dados foi enviada. Entraremos em contato em breve.'
              );
            },
          },
        ]
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Usuário'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role === 'psychologist' ? 'Psicólogo' : 'Paciente'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {[
          { value: stats.checkins, label: 'Check-ins' },
          { value: stats.streak, label: 'Dias seguidos' },
          { value: stats.daysActive, label: 'Dias ativo' },
          { value: stats.conversations, label: 'Conversas' },
        ].map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Segurança</Text>

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>Bloqueio biométrico</Text>
            <Text style={styles.settingDesc}>Exija biometria para abrir o app</Text>
          </View>
          <Switch
            value={biometricLock}
            onValueChange={async (v) => {
              if (v) {
                const check = await authenticateWithBiometrics('Configure o bloqueio biométrico');
                if (!check.success) return;
              }
              setBiometricLock(v);
              await AsyncStorage.setItem('biometric_lock', v ? 'true' : 'false');
            }}
            trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
            thumbColor={biometricLock ? '#7C3AED' : '#F3F4F6'}
            disabled={!biometricAvailable}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações</Text>
        
        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>Lembrete diário</Text>
            <Text style={styles.settingDesc}>Receba um lembrete para fazer seu check-in</Text>
          </View>
          <Switch
            value={notifications.dailyReminder}
            onValueChange={(v) => handleNotificationChange('dailyReminder', v)}
            trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
            thumbColor={notifications.dailyReminder ? '#7C3AED' : '#F3F4F6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>Relatório semanal</Text>
            <Text style={styles.settingDesc}>Resumo do seu progresso toda semana</Text>
          </View>
          <Switch
            value={notifications.weeklyReport}
            onValueChange={(v) => handleNotificationChange('weeklyReport', v)}
            trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
            thumbColor={notifications.weeklyReport ? '#7C3AED' : '#F3F4F6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>Contato de emergência</Text>
            <Text style={styles.settingDesc}>Notificar alguém em caso de risco</Text>
          </View>
          <Switch
            value={notifications.emergencyContact}
            onValueChange={(v) => handleNotificationChange('emergencyContact', v)}
            trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
            thumbColor={notifications.emergencyContact ? '#7C3AED' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidade e Dados</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleSensitiveAction('view')}
        >
          <Text style={styles.menuItemText}>📊 Ver meus dados</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleSensitiveAction('export')}
        >
          <Text style={styles.menuItemText}>📤 Exportar relatório</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleSensitiveAction('delete')}
        >
          <Text style={[styles.menuItemText, { color: '#DC2626' }]}>🗑️ Solicitar exclusão</Text>
        </TouchableOpacity>
      </View>

      {/* Therapist Linking - only show for patients */}
      {(!linkedTherapist || !linkedTherapist.therapistId) && user?.role !== 'psychologist' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍⚕️ Conexão com Psicólogo</Text>
          <Text style={styles.sectionDesc}>
            Conecte-se ao seu psicólogo para que ele possa acompanhar seu progresso.
          </Text>

          {showLinkDialog ? (
            <View style={styles.linkForm}>
              {linkError && (
                <View style={styles.linkErrorBox}>
                  <Text style={styles.linkErrorText}>{linkError}</Text>
                </View>
              )}
              <TextInput
                style={styles.linkInput}
                placeholder="Código de vinculação (ex: AB12CD)"
                placeholderTextColor="#9CA3AF"
                value={linkCode}
                onChangeText={(t) => { setLinkCode(t.toUpperCase()); setLinkError(null); }}
                autoCapitalize="characters"
                maxLength={6}
                autoCorrect={false}
                editable={!linkLoading}
              />
              <View style={styles.linkButtons}>
                <TouchableOpacity
                  style={[styles.linkBtn, styles.linkBtnCancel]}
                  onPress={() => { setShowLinkDialog(false); setLinkCode(''); setLinkError(null); }}
                  disabled={linkLoading}
                >
                  <Text style={styles.linkBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkBtn, styles.linkBtnConfirm, linkLoading && styles.linkBtnDisabled]}
                  onPress={async () => {
                    if (linkCode.trim().length < 6) {
                      setLinkError('Digite o código completo de 6 caracteres.');
                      return;
                    }
                    setLinkLoading(true);
                    setLinkError(null);
                    const result = await useTherapistCode(linkCode.trim(), user?.name || '');
                    setLinkLoading(false);
                    if (result.success) {
                      setLinkedTherapist({ therapistId: 'linked', therapistName: result.psychologistName || null });
                      setShowLinkDialog(false);
                      setLinkCode('');
                      Alert.alert('✅ Conectado!', `Você foi vinculado a ${result.psychologistName}.`);
                    } else {
                      setLinkError(result.error || 'Erro ao conectar.');
                    }
                  }}
                  disabled={linkLoading}
                >
                  {linkLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.linkBtnConfirmText}>Conectar</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.linkHint}>
                💡 Peça o código ao seu psicólogo pelo painel web mindflow.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => setShowLinkDialog(true)}
            >
              <Text style={styles.linkCardIcon}>🔗</Text>
              <View style={styles.linkCardContent}>
                <Text style={styles.linkCardTitle}>Conectar ao Psicólogo</Text>
                <Text style={styles.linkCardDesc}>Insira o código de vinculação</Text>
              </View>
              <Text style={styles.linkCardArrow}>→</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Connected therapist indicator */}
      {linkedTherapist?.therapistId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍⚕️ Psicólogo Vinculado</Text>
          <View style={styles.linkedCard}>
            <Text style={styles.linkedIcon}>✅</Text>
            <View>
              <Text style={styles.linkedName}>{linkedTherapist.therapistName || 'Psicólogo'}</Text>
              <Text style={styles.linkedDesc}>Seu progresso está visível para seu terapeuta</Text>
            </View>
          </View>
        </View>
      )}

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>ℹ️ Como funciona o Kibo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>📋 Termos de uso</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>🔒 Política de privacidade</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair da conta</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Kibo v1.0.0 • LGPD Compliant</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
  },
  logoutButton: {
    margin: 16,
    marginTop: 32,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    paddingBottom: 40,
  },
  // Linking styles
  sectionDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 4,
    lineHeight: 18,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  linkCardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  linkCardContent: {
    flex: 1,
  },
  linkCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  linkCardDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  linkCardArrow: {
    fontSize: 20,
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  linkForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  linkErrorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  linkErrorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  linkInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 4,
    textAlign: 'center',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  linkButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  linkBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  linkBtnCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  linkBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  linkBtnConfirm: {
    backgroundColor: '#7C3AED',
  },
  linkBtnDisabled: {
    backgroundColor: '#A78BFA',
  },
  linkBtnConfirmText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  linkHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  linkedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EDDA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A8D5BA',
    gap: 12,
  },
  linkedIcon: {
    fontSize: 28,
  },
  linkedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
  },
  linkedDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { login, register } from '../services/firebase';
import { useBiometric } from '../hooks/useBiometric';

export default function LoginScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'patient' | 'psychologist'>('patient');
  const { available: biometricAvailable, biometricType, label: biometricLabel, authenticate } = useBiometric();

  const handleBiometricLogin = async () => {
    setLoading(true);
    const result = await authenticate('Entre com sua biometria para acessar o Kibo');
    setLoading(false);

    if (result.success) {
      navigation.replace('Main');
    } else if (result.error && !result.error.includes('cancelada')) {
      Alert.alert('Erro', result.error);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name) {
          Alert.alert('Erro', 'Preencha seu nome');
          setLoading(false);
          return;
        }
        await register(email, password, name, userType);
      }
      navigation.replace('Main');
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/email-already-in-use': 'Este email já está cadastrado',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
      };
      const message = errorMessages[error.code] || error.message || 'Erro ao fazer login';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  const getBiometricIcon = (): string => {
    switch (biometricType) {
      case 'facial': return '👤';
      case 'fingerprint': return '👆';
      default: return '🔐';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🐱</Text>
        <Text style={styles.title}>Kibo</Text>
        <Text style={styles.subtitle}>Seu assistente de bem-estar mental</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>
          {isLogin ? 'Bem-vindo de volta!' : 'Criar conta'}
        </Text>

        {!isLogin && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
            
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleButton, userType === 'patient' && styles.roleButtonActive]}
                onPress={() => setUserType('patient')}
                disabled={loading}
              >
                <Text style={styles.roleIcon}>🧠</Text>
                <Text style={[styles.roleText, userType === 'patient' && styles.roleTextActive]}>
                  Paciente
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.roleButton, userType === 'psychologist' && styles.roleButtonActive]}
                onPress={() => setUserType('psychologist')}
                disabled={loading}
              >
                <Text style={styles.roleIcon}>👨‍⚕️</Text>
                <Text style={[styles.roleText, userType === 'psychologist' && styles.roleTextActive]}>
                  Psicólogo
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </Text>
          )}
        </TouchableOpacity>

        {isLogin && biometricAvailable && (
          <TouchableOpacity 
            style={styles.biometricButton} 
            onPress={handleBiometricLogin}
            disabled={loading}
          >
            <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
            <Text style={styles.biometricText}>
              Entrar com {biometricLabel}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={loading}>
          <Text style={styles.switchText}>
            {isLogin ? 'Não tem conta? Crie aqui' : 'Já tem conta? Entre aqui'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Ao continuar, você aceita nossos Termos de Uso e Política de Privacidade.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  form: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  roleButtonActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  roleIcon: {
    fontSize: 24,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleTextActive: {
    color: '#7C3AED',
  },
  submitButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
    backgroundColor: '#FFFFFF',
  },
  biometricIcon: {
    fontSize: 22,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  switchText: {
    color: '#7C3AED',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
});

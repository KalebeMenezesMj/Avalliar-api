import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_700Bold_Italic,
} from '@expo-google-fonts/poppins';

import HomeScreen, { NavigationTarget } from './src/screens/HomeScreen';
import DemandasScreen, { EmpresaDemanda } from './src/screens/DemandasScreen';
import EmpresaDemandasScreen, { TarefaDemanda } from './src/screens/EmpresaDemandasScreen';
import DemandaDetalheScreen from './src/screens/DemandaDetalheScreen';
import UsuariosScreen from './src/screens/UsuariosScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import NovaDemandaScreen from './src/screens/NovaDemandaScreen';
import PainelScreen from './src/screens/PainelScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { TabType } from './src/components/BottomNavigation';
import { AuthResponse } from './src/services/authService';

type CurrentScreen =
  | 'home'
  | 'welcome'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'demandas'
  | 'empresa-demandas'
  | 'demanda-detalhe'
  | 'tarefas'
  | 'painel'
  | 'configuracoes'
  | 'settings'
  | 'nova-demanda'
  | 'listar-demandas'
  | 'usuarios';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
  });

  // Usuário autenticado inicial para demonstração
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>({
    nome: 'Linux da Silva',
    email: 'linux.silva@fatec.sp.gov.br',
    role: 'GESTOR',
    token: '',
  });

  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>('home');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaDemanda | null>(null);
  const [demandaAtiva, setDemandaAtiva] = useState<TarefaDemanda | null>(null);

  if (!fontsLoaded) return null;

  const handleLoginSuccess = (user: AuthResponse) => {
    setCurrentUser(user);
    setActiveTab('home');
    setCurrentScreen('home');
  };

  const handleRegisterSuccess = () => {
    setCurrentScreen('login');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('welcome');
  };

  const handleNavigate = (target: NavigationTarget) => {
    setCurrentScreen(target);
    if (
      target === 'home' ||
      target === 'demandas' ||
      target === 'tarefas' ||
      target === 'painel' ||
      target === 'configuracoes'
    ) {
      setActiveTab(target as TabType);
    } else if (target === 'listar-demandas') {
      setActiveTab('demandas');
    }
  };

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentScreen(tab);
  };

  return (
    <SafeAreaProvider>
      {currentScreen === 'home' && (
        <HomeScreen
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          activeTab={activeTab}
          onSelectTab={handleTabSelect}
        />
      )}

      {currentScreen === 'welcome' && (
        <WelcomeScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
          onNavigateToRegister={() => setCurrentScreen('register')}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'login' && (
        <LoginScreen
          onBack={() => setCurrentScreen(currentUser ? 'home' : 'welcome')}
          onNavigateToRegister={() => setCurrentScreen('register')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen
          onBack={() => setCurrentScreen('login')}
          onNavigateToLogin={() => setCurrentScreen('login')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}

      {currentScreen === 'nova-demanda' && (
        <NovaDemandaScreen
          currentUser={currentUser}
          onBack={() => handleNavigate('demandas')}
          onSuccess={() => handleNavigate('demandas')}
          onNavigateTab={handleTabSelect}
          onLogout={handleLogout}
          activeTab="demandas"
        />
      )}

      {(currentScreen === 'listar-demandas' || currentScreen === 'demandas') && (
        <DemandasScreen
          currentUser={currentUser}
          onBack={() => handleNavigate('home')}
          onNavigateToNovaDemanda={() => handleNavigate('nova-demanda')}
          onNavigateTab={handleTabSelect}
          onSelectEmpresa={(empresa) => {
            setEmpresaAtiva(empresa);
            setCurrentScreen('empresa-demandas');
          }}
          onLogout={handleLogout}
          activeTab="demandas"
        />
      )}

      {currentScreen === 'empresa-demandas' && empresaAtiva && (
        <EmpresaDemandasScreen
          empresa={empresaAtiva}
          currentUser={currentUser}
          onBack={() => setCurrentScreen('demandas')}
          onNavigateToNovaDemanda={() => handleNavigate('nova-demanda')}
          onSelectDemanda={(demanda) => {
            setDemandaAtiva(demanda);
            setCurrentScreen('demanda-detalhe');
          }}
          onNavigateTab={handleTabSelect}
          onLogout={handleLogout}
          activeTab="demandas"
        />
      )}

      {currentScreen === 'demanda-detalhe' && empresaAtiva && demandaAtiva && (
        <DemandaDetalheScreen
          empresa={empresaAtiva}
          demandaInicial={demandaAtiva}
          currentUser={currentUser}
          onBack={() => setCurrentScreen('empresa-demandas')}
          onNavigateTab={handleTabSelect}
          activeTab="demandas"
        />
      )}

      {currentScreen === 'tarefas' && (
        <PlaceholderScreen
          title="Minhas Tarefas"
          description="Lista das vistorias de imóveis e laudos fotográficos atribuídos diretamente a você com prazos e ordens de serviço."
          iconName="task"
          onBack={() => handleNavigate('home')}
          onNavigateTab={handleTabSelect}
          activeTab="tarefas"
        />
      )}

      {currentScreen === 'painel' && (
        <PainelScreen
          currentUser={currentUser}
          onBack={() => handleNavigate('home')}
          onNavigateTab={handleTabSelect}
          onSelectEmpresa={(empresa) => {
            setEmpresaAtiva(empresa);
            setCurrentScreen('empresa-demandas');
          }}
          onLogout={handleLogout}
          activeTab="painel"
        />
      )}

      {currentScreen === 'usuarios' && (
        <UsuariosScreen
          currentUser={currentUser}
          onBack={() => handleNavigate('home')}
          onNavigateTab={handleTabSelect}
          onLogout={handleLogout}
          activeTab={activeTab}
        />
      )}

      {currentScreen === 'configuracoes' && (
        <SettingsScreen
          onBack={() => handleNavigate('home')}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Barra de status clara para telas com header vermelho, escura para outras */}
      <StatusBar
        style={
          currentScreen === 'home' ||
          currentScreen === 'demandas' ||
          currentScreen === 'listar-demandas' ||
          currentScreen === 'empresa-demandas' ||
          currentScreen === 'demanda-detalhe' ||
          currentScreen === 'painel' ||
          currentScreen === 'usuarios'
            ? 'light'
            : 'dark'
        }
      />
    </SafeAreaProvider>
  );
}

import { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registrar } from './src/services/logService';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
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
import EditProfileScreen from './src/screens/EditProfileScreen'; // Import new screen
import { TabType } from './src/components/BottomNavigation';
import ScreenTransition from './src/components/ScreenTransition';
import TabsCarousel from './src/components/TabsCarousel';
import { AuthResponse } from './src/services/authService';
import { definirTokenAutenticacao } from './src/services/api';
import { carregarSessao, salvarSessao, limparSessao } from './src/services/sessionStorage';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';

export type CurrentScreen =
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
  | 'usuarios'
  | 'edit-profile'; // Added edit-profile screen

// Telas autônomas (fora do app logado): trocam por transição própria.
const AUTH_SCREENS: CurrentScreen[] = ['welcome', 'login', 'register'];

// Telas "empurradas" sobre as abas: entram por cima e revelam o carrossel ao sair.
const OVERLAY_SCREENS: CurrentScreen[] = ['empresa-demandas', 'demanda-detalhe', 'nova-demanda', 'usuarios', 'edit-profile']; // Added edit-profile

// Colunas fixas do carrossel, na ordem física da barra inferior.
const COLUMN_SCREENS: CurrentScreen[] = ['painel', 'home', 'demandas', 'configuracoes'];

const TAB_INDEX: Record<TabType, number> = {
  painel: 0,
  home: 1,
  demandas: 2,
  tarefas: 2,
  configuracoes: 3,
};

// Posição física das abas na barra inferior — o deslize segue o lado real da aba
// (ex.: Painel fica à esquerda de Início, então "voltar" para ele sai pela esquerda).
const TAB_POSITION: Partial<Record<CurrentScreen, number>> = {
  painel: 0,
  home: 1,
  demandas: 2,
  'listar-demandas': 2,
  tarefas: 2,
  configuracoes: 3,
};

// Telas que não são aba: profundidade (telas abertas sobre outras são mais profundas).
const SCREEN_DEPTH: Record<CurrentScreen, number> = {
  welcome: 0,
  login: 0,
  register: 0,
  painel: 1,
  home: 1,
  dashboard: 1,
  'listar-demandas': 1,
  demandas: 1,
  tarefas: 1,
  configuracoes: 1,
  settings: 1,
  usuarios: 1,
  'nova-demanda': 2,
  'empresa-demandas': 2,
  'edit-profile': 2, // Added depth for edit-profile
  'demanda-detalhe': 3,
};

function navigationDirection(prev: CurrentScreen, next: CurrentScreen): 'forward' | 'back' {
  const prevTab = TAB_POSITION[prev];
  const nextTab = TAB_POSITION[next];
  if (prevTab !== undefined && nextTab !== undefined) {
    return nextTab >= prevTab ? 'forward' : 'back';
  }
  return SCREEN_DEPTH[next] >= SCREEN_DEPTH[prev] ? 'forward' : 'back';
}

function Root() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
  });

  // Sem usuário por padrão: o app só entra depois de cadastro e login (ou sessão salva válida)
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null);
  const [sessaoCarregada, setSessaoCarregada] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>('welcome');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaDemanda | null>(null);
  const [demandaAtiva, setDemandaAtiva] = useState<TarefaDemanda | null>(null);

  // Direção da próxima transição (forward = entra da direita, back = da esquerda).
  // Calculada no próprio render para os wrappers já montarem com o valor certo.
  const prevScreenRef = useRef<CurrentScreen>('welcome');
  const directionRef = useRef<'forward' | 'back'>('forward');
  if (prevScreenRef.current !== currentScreen) {
    directionRef.current = navigationDirection(prevScreenRef.current, currentScreen);
    prevScreenRef.current = currentScreen;
  }

  // Botão voltar do Android: volta para a tela anterior do app; só fecha o app na tela inicial
  const historicoTelas = useRef<CurrentScreen[]>([]);
  const telaAnteriorRef = useRef<CurrentScreen>('welcome');
  const voltandoRef = useRef(false);

  useEffect(() => {
    if (currentScreen === 'home') {
      // A tela inicial é a raiz: voltar a partir dela fecha o app
      historicoTelas.current = [];
    }
    if (voltandoRef.current) {
      voltandoRef.current = false;
    } else if (telaAnteriorRef.current !== currentScreen) {
      historicoTelas.current.push(telaAnteriorRef.current);
      if (historicoTelas.current.length > 50) historicoTelas.current.shift();
    }
    telaAnteriorRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      const anterior = historicoTelas.current.pop();
      if (anterior) {
        voltandoRef.current = true;
        setCurrentScreen(anterior);
        return true;
      }
      return false; // na tela inicial, o Android fecha o app
    });
    return () => assinatura.remove();
  }, []);

  // Diagnóstico: registra quando o app vai para segundo plano ou volta (ver Configurações > Log)
  useEffect(() => {
    registrar('app.iniciado');
    const assinatura = AppState.addEventListener('change', (estado) => {
      registrar('app.estado', { estado });
    });
    return () => assinatura.remove();
  }, []);

  // Restaura a sessão salva (se ainda válida) antes de mostrar qualquer tela
  useEffect(() => {
    carregarSessao().then((sessao) => {
      if (sessao) {
        definirTokenAutenticacao(sessao.token);
        setCurrentUser(sessao);
        setActiveTab('home');
        setCurrentScreen('home');
      }
      setSessaoCarregada(true);
    });
  }, []);

  if (!fontsLoaded || !sessaoCarregada) return null;

  const handleLoginSuccess = (user: AuthResponse) => {
    definirTokenAutenticacao(user.token);
    salvarSessao(user);
    setCurrentUser(user);
    setActiveTab('home');
    setCurrentScreen('home');
  };

  const handleRegisterSuccess = () => {
    setCurrentScreen('login');
  };

  const handleLogout = () => {
    definirTokenAutenticacao(null);
    limparSessao();
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
    // "Tarefas" da barra abre a lista de demandas, que já traz as tarefas reais.
    setCurrentScreen(tab === 'tarefas' ? 'demandas' : (tab as CurrentScreen));
  };

  // Cada tela em função do nome — alimenta o carrossel de abas e as páginas
  // empurradas (que mantêm a tela anterior visível enquanto entram).
  const renderScreen = (name: CurrentScreen) => {
    switch (name) {
      case 'home':
        return (
          <HomeScreen
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            activeTab={activeTab}
            onSelectTab={handleTabSelect}
          />
        );

      case 'welcome':
        return (
          <WelcomeScreen
            onNavigateToLogin={() => setCurrentScreen('login')}
            onNavigateToRegister={() => setCurrentScreen('register')}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onBack={() => setCurrentScreen(currentUser ? 'home' : 'welcome')}
            onNavigateToRegister={() => setCurrentScreen('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );

      case 'register':
        return (
          <RegisterScreen
            onBack={() => setCurrentScreen('login')}
            onNavigateToLogin={() => setCurrentScreen('login')}
            onRegisterSuccess={handleRegisterSuccess}
          />
        );

      case 'nova-demanda':
        return (
          <NovaDemandaScreen
            currentUser={currentUser}
            onBack={() => handleNavigate('demandas')}
            onSuccess={() => handleNavigate('demandas')}
            onNavigateTab={handleTabSelect}
            onLogout={handleLogout}
            activeTab="demandas"
          />
        );

      case 'demandas':
      case 'listar-demandas':
        return (
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
        );

      case 'empresa-demandas':
        return empresaAtiva ? (
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
        ) : null;

      case 'demanda-detalhe':
        return empresaAtiva && demandaAtiva ? (
          <DemandaDetalheScreen
            empresa={empresaAtiva}
            demandaInicial={demandaAtiva}
            currentUser={currentUser}
            onBack={() => setCurrentScreen('empresa-demandas')}
            onNavigateTab={handleTabSelect}
            activeTab="demandas"
          />
        ) : null;

      case 'tarefas':
        return (
          <PlaceholderScreen
            title="Minhas Tarefas"
            description="Lista das vistorias de imóveis e laudos fotográficos atribuídos diretamente a você com prazos e ordens de serviço."
            iconName="task"
            onBack={() => handleNavigate('home')}
            onNavigateTab={handleTabSelect}
            activeTab="tarefas"
          />
        );

      case 'painel':
        return (
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
        );

      case 'usuarios':
        return (
          <UsuariosScreen
            currentUser={currentUser}
            onBack={() => handleNavigate('home')}
            onNavigateTab={handleTabSelect}
            onLogout={handleLogout}
            activeTab={activeTab}
          />
        );

      case 'configuracoes':
        return (
          <SettingsScreen
            onBack={() => handleNavigate('home')}
            currentUser={currentUser}
            onLogout={handleLogout}
            onEditProfile={() => setCurrentScreen('edit-profile')} // Added navigation to EditProfileScreen
          />
        );

      case 'edit-profile':
        return (
          <EditProfileScreen
            onBack={() => setCurrentScreen('configuracoes')}
            currentUser={currentUser}
          />
        );

      default:
        return null;
    }
  };

  const isAuthMode = AUTH_SCREENS.includes(currentScreen);
  const isOverlayMode = OVERLAY_SCREENS.includes(currentScreen);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {isAuthMode ? (
        <ScreenTransition
          screen={currentScreen}
          direction={directionRef.current}
          solidBase
          render={(name) => renderScreen(name as CurrentScreen)}
        />
      ) : (
        <>
          {/* Abas sempre vivas: o carrossel desliza entre elas sem reconstruir nada */}
          <TabsCarousel
            activeIndex={TAB_INDEX[activeTab]}
            count={COLUMN_SCREENS.length}
            renderColumn={(i) => renderScreen(COLUMN_SCREENS[i])}
          />
          {/* Páginas empurradas sobem por cima e revelam o carrossel ao voltar */}
          <ScreenTransition
            screen={isOverlayMode ? currentScreen : null}
            direction={directionRef.current}
            render={(name) => renderScreen(name as CurrentScreen)}
          />
        </>
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

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Root />
      </LanguageProvider>
    </ThemeProvider>
  );
}

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

import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { AuthResponse } from './src/services/authService';

type CurrentScreen = 'home' | 'login' | 'register';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
  });

  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>('home');
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null);

  if (!fontsLoaded) return null;

  const handleLoginSuccess = (user: AuthResponse) => {
    setCurrentUser(user);
    setCurrentScreen('home');
  };

  const handleRegisterSuccess = (user: AuthResponse) => {
    // Após cadastro com sucesso, direciona para o login para o usuário autenticar
    setCurrentScreen('login');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('home');
  };

  return (
    <SafeAreaProvider>
      {currentScreen === 'home' && (
        <HomeScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
          onNavigateToRegister={() => setCurrentScreen('register')}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'login' && (
        <LoginScreen
          onBack={() => setCurrentScreen('home')}
          onNavigateToRegister={() => setCurrentScreen('register')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen
          onBack={() => setCurrentScreen('home')}
          onNavigateToLogin={() => setCurrentScreen('login')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}

      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

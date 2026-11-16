import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Direction = 'forward' | 'back';

interface ScreenTransitionProps {
  // Página atual. null = sem página (o conteúdo da base aparece por baixo).
  screen: string | null;
  // "forward": a nova entra da direita; "back": entra pela esquerda.
  direction: Direction;
  // true: fundo sempre sólido (usa em telas autônomas, ex.: login).
  solidBase?: boolean;
  render: (name: string) => React.ReactNode;
}

const easeOut = Easing.bezier(0.25, 0.9, 0.3, 1);
const ENTER_SLIDE = 40;
const EXIT_SLIDE = 28;
const ENTER_DURATION = 320;
const EXIT_DURATION = 260;

// Uma página do transition. O componente NUNCA é remontado ao trocar de papel
// (chave estável por nome): assim a tela que sai continua com todo o estado
// real — dados carregados, scroll, tudo — enquanto desliza para fora.
function Page({
  isExit,
  direction,
  onExited,
  children,
}: {
  isExit: boolean;
  direction: Direction;
  onExited?: () => void;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  // Entrada (montagem): desliza do lado dado pela direção + fade.
  useEffect(() => {
    const dir = direction === 'forward' ? 1 : -1;
    translateX.setValue(dir * ENTER_SLIDE);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: ENTER_DURATION, easing: easeOut, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: ENTER_DURATION, easing: easeOut, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saída: mesmo componente (estado intacto) desliza para o lado oposto e some.
  useEffect(() => {
    if (!isExit) return;
    const dir = direction === 'forward' ? 1 : -1;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: EXIT_DURATION, easing: easeOut, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -dir * EXIT_SLIDE, duration: EXIT_DURATION, easing: easeOut, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onExitedRef.current?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExit]);

  return (
    <Animated.View
      pointerEvents={isExit ? 'none' : 'box-none'}
      style={[StyleSheet.absoluteFill, { opacity, transform: [{ translateX }] }]}
    >
      {children}
    </Animated.View>
  );
}

// Transição de páginas empurradas (detalhes, formulários, autenticação).
// A base pode ser transparente para revelar o carrossel de abas abaixo.
export default function ScreenTransition({ screen, direction, solidBase = false, render }: ScreenTransitionProps) {
  const { colors: t } = useTheme();

  const prevScreenRef = useRef<string | null>(screen);
  const [exit, setExit] = useState<{ name: string; id: number } | null>(null);
  const exitIdRef = useRef(0);

  // Detecta a troca no próprio render (padrão de estado derivado): assim a
  // página anterior já entra em modo "saindo" na mesma pintura em que a nova entra.
  if (prevScreenRef.current !== screen) {
    const old = prevScreenRef.current;
    prevScreenRef.current = screen;
    if (old !== null) {
      exitIdRef.current += 1;
      setExit({ name: old, id: exitIdRef.current });
    } else {
      setExit(null);
    }
  }

  // Rede de segurança: remove a camada de saída se o fim da animação se perder.
  useEffect(() => {
    if (!exit) return;
    const h = setTimeout(() => {
      setExit((e) => (e && e.id === exit.id ? null : e));
    }, EXIT_DURATION + 500);
    return () => clearTimeout(h);
  }, [exit]);

  const opaque = screen !== null || solidBase;

  return (
    <View
      pointerEvents={opaque ? 'auto' : 'box-none'}
      style={[StyleSheet.absoluteFill, { backgroundColor: opaque ? t.background : 'transparent' }]}
    >
      {exit && (
        <Page
          isExit
          key={`p-${exit.name}`}
          direction={direction}
          onExited={() => setExit((e) => (e && e.id === exit.id ? null : e))}
        >
          {render(exit.name)}
        </Page>
      )}
      {screen !== null && (
        <Page isExit={false} key={`p-${screen}`} direction={direction}>
          {render(screen)}
        </Page>
      )}
    </View>
  );
}

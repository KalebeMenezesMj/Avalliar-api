import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface TabsCarouselProps {
  activeIndex: number;
  count: number;
  renderColumn: (index: number) => React.ReactNode;
}

// Navegação horizontal estilo app nativo: as abas ficam lado a lado e a "câmera"
// desliza entre elas — troca sem recarregar dados, sem perder scroll e sem
// flash de tela de carregamento. As colunas montam sob demanda.
export default function TabsCarousel({ activeIndex, count, renderColumn }: TabsCarouselProps) {
  const { colors: t } = useTheme();
  const [width, setWidth] = useState(() => Math.floor(Dimensions.get('window').width));
  const widthRef = useRef(width);
  const [ready, setReady] = useState(false);

  // Abas montam sob demanda: as visitadas ficam sempre montadas (nunca são
  // desativadas) — não reconstrói depois e nem monta tudo de uma vez na abertura.
  // A ativação é derivada e ocorre no próprio render: a coluna já existe na
  // mesma pintura em que a câmera chega nela (sem flash de coluna vazia).
  const [activated, setActivated] = useState<boolean[]>(() =>
    Array.from({ length: count }, (_, i) => i === activeIndex)
  );
  if (!activated[activeIndex]) {
    setActivated(activated.map((v, i) => v || i <= activeIndex));
  }

  // Uma única tradução move todas as colunas (que se posicionam em sequência no
  // layout: coluna i fica em i × width). Resultado: a coluna ativa assenta
  // exatamente na origem do viewport e as demais ficam fora da janela.
  const translateX = useRef(new Animated.Value(-activeIndex * width)).current;

  const animateTo = (target: number, animate: boolean) => {
    const toValue = -target * widthRef.current;
    if (animate) {
      Animated.spring(translateX, { toValue, tension: 130, friction: 17, useNativeDriver: true }).start();
    } else {
      translateX.setValue(toValue);
    }
  };

  // Fade suave na primeira pintura do conjunto de abas (ex.: após o login).
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);

  // Safety net: se o onLayout demorar a chegar, garante a primeira pintura.
  const readyRef = useRef(ready);
  readyRef.current = ready;
  useEffect(() => {
    const h = setTimeout(() => {
      if (!readyRef.current) setReady(true);
    }, 500);
    return () => clearTimeout(h);
  }, []);

  // Troca de aba: desliza a câmera até a coluna ativa.
  useEffect(() => {
    if (!ready) return;
    animateTo(activeIndex, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, ready]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    const first = !ready;
    if (Math.abs(w - widthRef.current) > 1) {
      widthRef.current = w;
      setWidth(w);
    }
    setReady(true);
    // No primeiro layout posiciona sem animar; em redimensionamento anima.
    animateTo(activeIndex, !first);
  };

  return (
    <Animated.View style={[styles.base, { backgroundColor: t.background, opacity: fade }]}>
      <View style={styles.row} onLayout={handleLayout}>
        {Array.from({ length: count }, (_, i) => (
          <Animated.View key={i} style={[styles.column, { width, transform: [{ translateX }] }]}>
            {ready && activated[i] ? renderColumn(i) : null}
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    flex: 1,
  },
  column: {
    height: '100%',
  },
});

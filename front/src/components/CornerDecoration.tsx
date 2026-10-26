import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  position: 'topLeft' | 'bottomRight';
  size?: number;
  thickness?: number;
};

// Anel vermelho parcialmente cortado pela borda da tela (detalhe decorativo do protótipo).
// offsetX/offsetY definem quanto do anel fica fora da tela em cada eixo
// (fração do tamanho). Valores menores = anel mais visível.
export default function CornerDecoration({ position, size = 200, thickness = 12 }: Props) {
  const offsetX = -size * 0.5; // horizontal (left/right)
  const offsetY = -size * 0.5;  // vertical (top/bottom)
  const placement =
    position === 'topLeft'
      ? { top: offsetY, left: offsetX }
      : { bottom: offsetY, right: offsetX };

  return (
    <View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderWidth: thickness },
        placement,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderColor: colors.primary,
  },
});

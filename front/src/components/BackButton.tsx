import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = {
  onPress: () => void;
  style?: ViewStyle;
};

export default function BackButton({ onPress, style }: Props) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Ionicons name="arrow-back" size={20} color={t.text} />
    </Pressable>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: t.backButtonBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});

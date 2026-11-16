import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { fonts, radius, spacing } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  loading?: boolean;
  disabled?: boolean;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  loading = false,
  disabled = false,
}: Props) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? t.textOnPrimary : t.primary} />
      ) : (
        <Text style={[styles.text, { color: isPrimary ? t.textOnPrimary : t.text }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  base: {
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: t.primary,
  },
  secondary: {
    backgroundColor: t.cardBackground,
    borderWidth: 1,
    borderColor: t.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

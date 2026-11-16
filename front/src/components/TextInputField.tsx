import { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, radius, spacing } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isPassword?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
};

export default function TextInputField({
  label,
  value,
  onChangeText,
  placeholder,
  isPassword = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  error,
  containerStyle,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { colors: t } = useTheme();
  const styles = makeStyles(t);

  const isSecure = isPassword && !showPassword;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          !!error && styles.inputWrapperError,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.placeholder}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.input}
        />

        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={t.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: t.text,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.inputBackground,
    borderRadius: radius.md + 2,
    borderWidth: 1,
    borderColor: t.inputBorder,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  inputWrapperFocused: {
    borderColor: t.primary,
  },
  inputWrapperError: {
    borderColor: t.error,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: t.text,
    paddingVertical: spacing.sm + 2,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.error,
    marginTop: spacing.xs,
  },
});

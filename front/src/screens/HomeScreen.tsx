import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import Button from '../components/Button';
import CornerDecoration from '../components/CornerDecoration';
import { colors, fonts, spacing } from '../theme';

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <CornerDecoration position="topLeft" />
      <CornerDecoration position="bottomRight" />

      <SafeAreaView style={styles.container}>
        <View style={styles.brand}>
          <MaterialIcons name="settings" size={56} color={colors.text} />
          <Text style={styles.title}>Avalliar</Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Entrar"
            variant="primary"
            style={styles.button}
            onPress={() => console.log('Entrar')}
          />
          <Button
            title="Cadastrar-se"
            variant="secondary"
            style={styles.button}
            onPress={() => console.log('Cadastrar-se')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  brand: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.boldItalic,
    fontSize: 40,
    color: colors.text,
    marginTop: spacing.xs,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  button: {
    width: '70%',
    maxWidth: 320,
  },
});

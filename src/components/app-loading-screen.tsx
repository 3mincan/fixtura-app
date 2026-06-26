import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { IosScreen } from '@/components/ui/ios-screen';
import { useTheme } from '@/hooks/use-theme';

export function AppLoadingScreen() {
  const theme = useTheme();

  return (
    <IosScreen contentStyle={styles.content}>
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    </IosScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

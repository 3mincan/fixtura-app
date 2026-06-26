import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IosNavBar } from '@/components/ui/ios-nav-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/theme/tokens';

type IosScreenProps = {
  children: ReactNode;
  largeTitle?: string;
  navTitle?: string;
  backLabel?: string;
  onBack?: () => void;
  trailing?: React.ReactNode;
  backgroundImage?: ImageSource;
  backgroundVariant?: 'default' | 'premium';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function IosScreen({
  children,
  largeTitle,
  navTitle,
  backLabel,
  onBack,
  trailing,
  backgroundImage,
  backgroundVariant = 'default',
  style,
  contentStyle,
  edges = ['top', 'bottom'],
}: IosScreenProps) {
  const content = (
    <>
      {onBack || navTitle || trailing ? (
        <IosNavBar title={navTitle} backLabel={backLabel} onBack={onBack} trailing={trailing} />
      ) : null}

      {largeTitle ? (
        <ThemedText type="largeTitle" style={styles.largeTitle}>
          {largeTitle}
        </ThemedText>
      ) : null}

      <View style={[styles.content, contentStyle]}>{children}</View>
    </>
  );

  if (backgroundImage) {
    return (
      <View style={[styles.container, style]}>
        <Image source={backgroundImage} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(8,12,20,0.35)', 'rgba(8,12,20,0.72)', 'rgba(8,12,20,0.92)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={edges}>
          {content}
        </SafeAreaView>
      </View>
    );
  }

  if (backgroundVariant === 'premium') {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={require('@/assets/images/home-background.jpg')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(2, 8, 18, 0.48)', 'rgba(2, 8, 18, 0.72)', 'rgba(2, 8, 18, 0.92)']}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={edges}>
          {content}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, style]}>
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {content}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  largeTitle: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenHorizontal,
    paddingTop: 4,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
  },
});

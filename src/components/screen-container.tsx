import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { IosScreen } from '@/components/ui/ios-screen';
import { screenTransition } from '@/theme/animations';

type ScreenContainerProps = {
  children: ReactNode;
  largeTitle?: string;
  navTitle?: string;
  backLabel?: string;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ScreenContainer({
  children,
  largeTitle,
  navTitle,
  backLabel,
  onBack,
  style,
  contentStyle,
}: ScreenContainerProps) {
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusKey((currentKey) => currentKey + 1);
    }, []),
  );

  return (
    <IosScreen
      largeTitle={largeTitle}
      navTitle={navTitle}
      backLabel={backLabel}
      onBack={onBack}
      style={style}
      contentStyle={contentStyle}>
      <Animated.View key={focusKey} entering={screenTransition} style={{ flex: 1 }}>
        {children}
      </Animated.View>
    </IosScreen>
  );
}

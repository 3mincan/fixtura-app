import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Typography } from '@/theme/tokens';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'largeTitle'
    | 'title1'
    | 'title2'
    | 'title3'
    | 'headline'
    | 'body'
    | 'callout'
    | 'subheadline'
    | 'footnote'
    | 'caption'
    | 'captionBold';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.accent }],
        type === 'code' && styles.code,
        type === 'largeTitle' && styles.largeTitle,
        type === 'title1' && styles.title1,
        type === 'title2' && styles.title2,
        type === 'title3' && styles.title3,
        type === 'headline' && styles.headline,
        type === 'body' && styles.body,
        type === 'callout' && styles.callout,
        type === 'subheadline' && styles.subheadline,
        type === 'footnote' && styles.footnote,
        type === 'caption' && styles.caption,
        type === 'captionBold' && styles.captionBold,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
  largeTitle: Typography.largeTitle,
  title1: Typography.title1,
  title2: Typography.title2,
  title3: Typography.title3,
  headline: Typography.headline,
  body: Typography.body,
  callout: Typography.callout,
  subheadline: Typography.subheadline,
  footnote: Typography.footnote,
  caption: Typography.caption,
  captionBold: Typography.captionBold,
});

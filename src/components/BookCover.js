import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { coverPalettes, fonts, themedStyles } from '../constants/theme';

// Shows the chosen cover image, or an elegant book-cloth placeholder generated from the title.
export default function BookCover({ book, width = 100, style, rounded = true }) {
  const height = Math.round(width * 1.5);
  const frame = {
    width,
    height,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    borderTopRightRadius: rounded ? Math.max(4, width * 0.05) : 0,
    borderBottomRightRadius: rounded ? Math.max(4, width * 0.05) : 0,
  };

  if (!book) return <View style={[styles.frame, frame, { backgroundColor: '#E6E9E4' }, style]} />;

  const spine = <View pointerEvents="none" style={[styles.spine, { width: Math.max(5, width * 0.07) }]} />;

  if (book.cover_uri) {
    return (
      <View style={[styles.frame, frame, style]}>
        <Image source={{ uri: book.cover_uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {spine}
      </View>
    );
  }

  const palette = coverPalettes[(book.cover_color ?? 0) % coverPalettes.length];
  const small = width < 60;
  const titleSize = Math.max(8, Math.min(19, width * 0.115));
  const inset = Math.max(4, width * 0.07);

  return (
    <View style={[styles.frame, frame, { backgroundColor: palette.bg }, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.border,
          { top: inset, bottom: inset, left: inset + width * 0.06, right: inset, borderColor: palette.accent },
        ]}
      />
      <View style={[styles.content, { paddingHorizontal: inset + width * 0.1, paddingVertical: inset * 1.6 }]}>
        {!small && <MaterialCommunityIcons name="star-four-points-outline" size={Math.max(10, width * 0.13)} color={palette.accent} />}
        <Text
          numberOfLines={small ? 3 : 4}
          style={{
            fontFamily: fonts.serif,
            fontSize: titleSize,
            lineHeight: titleSize * 1.22,
            color: palette.ink,
            textAlign: 'center',
            marginTop: small ? 0 : width * 0.06,
          }}
        >
          {book.title}
        </Text>
        {!small && (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.sansSemi,
              fontSize: Math.max(7, width * 0.07),
              color: palette.accent,
              marginTop: width * 0.07,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}
          >
            {String(book.author || '').split(' ').slice(-1)[0]}
          </Text>
        )}
      </View>
      {spine}
    </View>
  );
}

const styles = themedStyles(() => ({
  frame: {
    overflow: 'hidden',
    backgroundColor: '#E6E9E4',
    shadowColor: '#2D312E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.16)' },
  border: { position: 'absolute', borderWidth: 1, borderRadius: 2, opacity: 0.7 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
}));

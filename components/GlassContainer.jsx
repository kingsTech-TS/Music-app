import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { BlurView } from 'expo-blur';

export default function GlassContainer({ artwork, children }) {
  return (
    <View style={styles.container}>
      {artwork && (
        <Image 
          source={{ uri: artwork }} 
          style={[StyleSheet.absoluteFill, styles.backgroundArt]} 
          blurRadius={50}
        />
      )}
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundArt: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
});

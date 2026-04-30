import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Image, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/usePlayerStore';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: 'User friendly mp3 music player for your device',
    image: 'https://picsum.photos/seed/on1/800/1200',
  },
  {
    id: 2,
    title: 'We provide a better audio experience than others',
    image: 'https://picsum.photos/seed/on2/800/1200',
  },
  {
    id: 3,
    title: 'Listen to the best audio & music with Mume now!',
    image: 'https://picsum.photos/seed/on3/800/1200',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const { theme } = usePlayerStore();

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/(tabs)');
    }
  };

  const item = onboardingData[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <Image source={{ uri: item.image }} style={styles.bgImage} />
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoIcon, { backgroundColor: theme.accent }]}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={[styles.brandName, { color: '#fff' }]}>Mume</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          
          <View style={styles.dotContainer}>
            {onboardingData.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  { backgroundColor: i === currentIndex ? theme.accent : '#555' },
                  i === currentIndex && { width: 30 }
                ]} 
              />
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.nextButton, { backgroundColor: theme.accent }]} 
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>
              {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    position: 'absolute',
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: 'rgba(24, 26, 32, 0.6)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
  },
  textContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 45,
    marginBottom: 30,
  },
  dotContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 35,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

import React, { useState, memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: ViewStyle;
  contentFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  placeholder?: string;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  onLoad?: () => void;
  onError?: (error: any) => void;
  blurhash?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  source,
  style,
  contentFit = 'cover',
  placeholder = 'https://via.placeholder.com/300x200?text=Loading...',
  fallbackIcon = 'image-outline',
  priority = 'normal',
  cachePolicy = 'memory-disk',
  onLoad,
  onError,
  blurhash,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setHasError(true);
    console.warn('Image loading error:', error);
    onError?.(error);
  };

  // Create cache key based on URL for better cache management
  const getCacheKey = (uri: string): string => {
    try {
      const url = new URL(uri);
      // Remove query parameters that might change frequently
      return `${url.origin}${url.pathname}`;
    } catch {
      return uri;
    }
  };

  const imageSource = typeof source === 'object' && source.uri 
    ? { uri: source.uri, cacheKey: getCacheKey(source.uri) } 
    : source;

  if (hasError) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Ionicons 
          name={fallbackIcon} 
          size={32} 
          color="#ccc" 
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={imageSource}
        style={styles.image}
        contentFit={contentFit}
        placeholder={blurhash ? { blurhash } : placeholder}
        placeholderContentFit="cover"
        cachePolicy={cachePolicy}
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        transition={200}
        recyclingKey={typeof imageSource === 'object' ? imageSource.cacheKey : undefined}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingPlaceholder} />
        </View>
      )}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingPlaceholder: {
    width: '80%',
    height: '60%',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
});

export default OptimizedImage;
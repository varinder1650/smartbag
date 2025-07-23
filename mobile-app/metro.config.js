const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add a custom resolver to exclude 'react-native-maps' from web builds
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'empty' }; // Exclude react-native-maps on web
  }
  // Ensure you call the default resolver for other modules
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
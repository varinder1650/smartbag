const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const cache = new Map();

export const getFromCache = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

export const setInCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

export const clearCache = () => {
  cache.clear();
};

export const withCache = (key, fn) => async (...args) => {
  const cacheKey = typeof key === 'function' ? key(...args) : key;
  const cachedData = getFromCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  const data = await fn(...args);
  setInCache(cacheKey, data);
  return data;
};

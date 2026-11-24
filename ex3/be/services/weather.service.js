const axios = require('axios');
const { performance } = require('node:perf_hooks');

const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.WEATHER_TIMEOUT_MS) || 5000;
const weatherCache = new Map();

async function requestWithRetry(request) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      const isNotFound = error.status === 404 || error.response?.status === 404;
      if (attempt === 1 || isNotFound) throw error;
    }
  }
}

async function getCoordinatesForCity(city) {
  const response = await requestWithRetry(() => axios.get(
    'https://geocoding-api.open-meteo.com/v1/search',
    {
      params: { name: city, count: 1 },
      timeout: REQUEST_TIMEOUT_MS
    }
  ));
  const result = response.data.results?.[0];
  if (!result) {
    const error = new Error(`City "${city}" was not found.`);
    error.status = 404;
    throw error;
  }
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    resolvedName: result.name
  };
}

async function getCurrentWeather(city) {
  const startedAt = performance.now();
  const cacheKey = city.toLocaleLowerCase();
  let outcome = 'miss';

  try {
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      outcome = 'hit';
      return cached.weather;
    }
    if (cached) weatherCache.delete(cacheKey);

    const { latitude, longitude, resolvedName } = await getCoordinatesForCity(city);
    const response = await requestWithRetry(() => axios.get(
      'https://api.open-meteo.com/v1/forecast',
      {
        params: { latitude, longitude, current_weather: true },
        timeout: REQUEST_TIMEOUT_MS
      }
    ));
    const current = response.data.current_weather;
    if (!current) {
      throw new Error('The weather service returned no current conditions.');
    }

    const weather = {
      city: resolvedName,
      temperatureC: current.temperature,
      windSpeedKmh: current.windspeed,
      observedAt: current.time
    };
    weatherCache.set(cacheKey, { weather, expiresAt: Date.now() + CACHE_TTL_MS });
    return weather;
  } finally {
    const elapsedMs = (performance.now() - startedAt).toFixed(1);
    console.log(`[weather] city="${city}" cache=${outcome} duration=${elapsedMs}ms`);
  }
}

module.exports = { getCurrentWeather };

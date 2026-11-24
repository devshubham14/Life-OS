import {
  DEFAULT_WEATHER_LOCATION,
  normalizeWeatherIconUrl,
  type WeatherData,
  type WeatherLocationSuggestion,
} from './weather';

const WEATHER_API_BASE = 'https://api.weatherapi.com/v1';
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const weatherCache = new Map<string, CacheEntry<WeatherData>>();
const searchCache = new Map<string, CacheEntry<WeatherLocationSuggestion[]>>();

interface WeatherApiErrorBody {
  error?: {
    code?: number;
    message?: string;
  };
}

interface WeatherApiCurrentResponse extends WeatherApiErrorBody {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
    lat: number;
    lon: number;
  };
  current: {
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    wind_kph: number;
    is_day: number;
    last_updated: string;
    condition: {
      text: string;
      icon: string;
    };
  };
}

interface WeatherApiForecastDay {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    daily_chance_of_rain?: number;
    condition: {
      text: string;
      icon: string;
    };
  };
}

interface WeatherApiForecastResponse extends WeatherApiErrorBody {
  location: WeatherApiCurrentResponse['location'];
  current: WeatherApiCurrentResponse['current'];
  forecast: {
    forecastday: WeatherApiForecastDay[];
  };
}

interface WeatherApiSearchItem {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}

function jsonResponse(body: unknown, status = 200, cacheControl = 'no-store'): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
    },
  });
}

function getApiKey(): string | undefined {
  const proc = typeof process !== 'undefined' ? process.env : undefined;
  const key = proc?.['WEATHER_API_KEY'];
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined;
}

function formatDayName(isoDate: string, index: number): string {
  if (index === 0) return 'Today';
  const parsed = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

export async function handleWeatherRequest(request: Request): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return jsonResponse(
      {
        error: 'Weather service is not configured. Set WEATHER_API_KEY on the server.',
        code: 'MISSING_API_KEY',
      },
      503,
    );
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') === 'search' ? 'search' : 'weather';
  const rawQuery = (url.searchParams.get('q') ?? '').trim();
  const forceRefresh = url.searchParams.get('refresh') === '1';

  if (mode === 'search') {
    if (rawQuery.length < 2) {
      return jsonResponse({ results: [] }, 200, 'public, max-age=300');
    }
    const query = rawQuery.slice(0, 120);
    const cacheKey = query.toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return jsonResponse({ results: cached.data, cached: true }, 200, 'public, max-age=1800');
    }

    try {
      const upstreamUrl = `${WEATHER_API_BASE}/search.json?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}`;
      const res = await fetch(upstreamUrl, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        return jsonResponse({ error: 'Unable to search locations right now.', code: 'SEARCH_FAILED' }, res.status >= 500 ? 502 : 400);
      }
      const items = (await res.json()) as WeatherApiSearchItem[];
      const results: WeatherLocationSuggestion[] = Array.isArray(items)
        ? items.slice(0, 6).map(item => ({
            id: item.id,
            name: item.name,
            region: item.region,
            country: item.country,
            lat: item.lat,
            lon: item.lon,
            url: item.url,
          }))
        : [];
      searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, data: results });
      return jsonResponse({ results, cached: false }, 200, 'public, max-age=1800');
    } catch {
      return jsonResponse({ error: 'Failed to reach weather search service.', code: 'NETWORK_ERROR' }, 502);
    }
  }

  const query = (rawQuery || DEFAULT_WEATHER_LOCATION).slice(0, 120);
  const cacheKey = query.toLowerCase();
  const cached = weatherCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return jsonResponse({ weather: cached.data, cached: true }, 200, 'public, max-age=300, stale-while-revalidate=600');
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const encodedKey = encodeURIComponent(apiKey);
    const currentUrl = `${WEATHER_API_BASE}/current.json?key=${encodedKey}&q=${encodedQuery}&aqi=no`;
    const forecastUrl = `${WEATHER_API_BASE}/forecast.json?key=${encodedKey}&q=${encodedQuery}&days=3&aqi=no&alerts=no`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl, { headers: { accept: 'application/json' } }),
      fetch(forecastUrl, { headers: { accept: 'application/json' } }),
    ]);

    const currentJson = (await currentRes.json()) as WeatherApiCurrentResponse;
    const forecastJson = (await forecastRes.json()) as WeatherApiForecastResponse;

    if (!currentRes.ok || currentJson.error) {
      const apiErr = currentJson.error;
      const status = apiErr?.code === 1006 ? 404 : currentRes.status >= 500 ? 502 : 400;
      return jsonResponse(
        {
          error: apiErr?.message ?? 'Unable to fetch current weather for this location.',
          code: apiErr?.code ? `WEATHERAPI_${apiErr.code}` : 'UPSTREAM_ERROR',
        },
        status,
      );
    }

    if (!forecastRes.ok || forecastJson.error) {
      const apiErr = forecastJson.error;
      const status = apiErr?.code === 1006 ? 404 : forecastRes.status >= 500 ? 502 : 400;
      return jsonResponse(
        {
          error: apiErr?.message ?? 'Unable to fetch weather forecast for this location.',
          code: apiErr?.code ? `WEATHERAPI_${apiErr.code}` : 'UPSTREAM_ERROR',
        },
        status,
      );
    }

    const forecastDays = forecastJson.forecast?.forecastday ?? [];
    const todayForecast = forecastDays[0];

    const normalized: WeatherData = {
      location: {
        name: currentJson.location.name,
        region: currentJson.location.region,
        country: currentJson.location.country,
        localtime: currentJson.location.localtime,
        lat: currentJson.location.lat,
        lon: currentJson.location.lon,
      },
      current: {
        tempC: Math.round(currentJson.current.temp_c),
        feelsLikeC: Math.round(currentJson.current.feelslike_c),
        humidity: currentJson.current.humidity,
        windKph: Math.round(currentJson.current.wind_kph),
        conditionText: currentJson.current.condition.text,
        conditionIcon: normalizeWeatherIconUrl(currentJson.current.condition.icon),
        isDay: currentJson.current.is_day === 1,
        lastUpdated: currentJson.current.last_updated,
      },
      today: {
        maxTempC: Math.round(todayForecast?.day.maxtemp_c ?? currentJson.current.temp_c),
        minTempC: Math.round(todayForecast?.day.mintemp_c ?? currentJson.current.temp_c),
      },
      forecast: forecastDays.slice(0, 3).map((day, idx) => ({
        date: day.date,
        dayName: formatDayName(day.date, idx),
        maxTempC: Math.round(day.day.maxtemp_c),
        minTempC: Math.round(day.day.mintemp_c),
        conditionText: day.day.condition.text,
        conditionIcon: normalizeWeatherIconUrl(day.day.condition.icon),
        chanceOfRain: day.day.daily_chance_of_rain ?? 0,
      })),
      fetchedAt: Date.now(),
    };

    weatherCache.set(cacheKey, { expiresAt: Date.now() + WEATHER_CACHE_TTL_MS, data: normalized });
    return jsonResponse({ weather: normalized, cached: false }, 200, 'public, max-age=300, stale-while-revalidate=600');
  } catch {
    return jsonResponse(
      {
        error: 'Unable to connect to the weather service right now.',
        code: 'NETWORK_ERROR',
      },
      502,
    );
  }
}

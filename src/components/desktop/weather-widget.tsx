import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CloudOff,
  CloudSun,
  Droplets,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_WEATHER_LOCATION,
  type WeatherData,
  type WeatherLocationSuggestion,
} from '@/lib/weather';

const LOCATION_STORAGE_KEY = 'lifeos.weather.location.v1';
const CACHE_STORAGE_KEY = 'lifeos.weather.cache.v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CachedWeatherRecord {
  expiresAt: number;
  data: WeatherData;
}

const inflightRequests = new Map<string, Promise<WeatherData>>();

function readStoredLocation(): string {
  try {
    const saved = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    return saved && saved.trim().length > 0 ? saved.trim() : DEFAULT_WEATHER_LOCATION;
  } catch {
    return DEFAULT_WEATHER_LOCATION;
  }
}

function saveStoredLocation(query: string): void {
  try {
    window.localStorage.setItem(LOCATION_STORAGE_KEY, query);
  } catch {
    // Ignore storage quota errors
  }
}

function readWeatherCache(query: string): { data: WeatherData; fresh: boolean } | null {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, CachedWeatherRecord>;
    const entry = parsed[query.toLowerCase()];
    if (!entry) return null;
    return { data: entry.data, fresh: entry.expiresAt > Date.now() };
  } catch {
    return null;
  }
}

function writeWeatherCache(query: string, data: WeatherData): void {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, CachedWeatherRecord>) : {};
    const keys = Object.keys(parsed);
    if (keys.length >= 6) {
      const oldestKey = keys[0];
      if (oldestKey) delete parsed[oldestKey];
    }
    parsed[query.toLowerCase()] = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data,
    };
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage quota errors
  }
}

async function fetchWeatherFromProxy(query: string, forceRefresh: boolean): Promise<WeatherData> {
  const key = `${query.toLowerCase()}:${forceRefresh ? '1' : '0'}`;
  const existing = inflightRequests.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const params = new URLSearchParams({ q: query });
    if (forceRefresh) params.set('refresh', '1');
    const response = await fetch(`/api/weather?${params.toString()}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error('Weather API returned an unexpected response.');
    }
    const payload = (await response.json()) as { weather?: WeatherData; error?: string };
    if (!response.ok || !payload.weather) {
      throw new Error(payload.error ?? 'Unable to load weather data.');
    }
    writeWeatherCache(query, payload.weather);
    return payload.weather;
  })();

  inflightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(key);
  }
}

export function WeatherWidget() {
  const [locationQuery, setLocationQuery] = useState<string>(() =>
    typeof window !== 'undefined' ? readStoredLocation() : DEFAULT_WEATHER_LOCATION,
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<WeatherLocationSuggestion[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadWeather = useCallback(
    async (query: string, options?: { forceRefresh?: boolean }) => {
      const forceRefresh = options?.forceRefresh ?? false;
      const cached = readWeatherCache(query);

      if (cached) {
        setWeather(cached.data);
        if (cached.fresh && !forceRefresh) {
          setLoading(false);
          setError(null);
          return;
        }
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        setLoading(false);
        setRefreshing(false);
        if (!cached) {
          setError('You are offline. Connect to the internet to load weather.');
        }
        return;
      }

      setError(null);
      if (forceRefresh || cached) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await fetchWeatherFromProxy(query, forceRefresh);
        setWeather(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load weather.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadWeather(locationQuery);
  }, [locationQuery, loadWeather]);

  useEffect(() => {
    const onOnline = () => {
      setIsOffline(false);
      void loadWeather(locationQuery);
    };
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [locationQuery, loadWeather]);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!searchOpen || trimmed.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    if (isOffline) return;

    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/weather?mode=search&q=${encodeURIComponent(trimmed)}`);
        const payload = (await res.json()) as { results?: WeatherLocationSuggestion[] };
        if (!cancelled) {
          setSuggestions(Array.isArray(payload.results) ? payload.results : []);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchTerm, searchOpen, isOffline]);

  const selectLocation = (query: string) => {
    const next = query.trim() || DEFAULT_WEATHER_LOCATION;
    saveStoredLocation(next);
    setLocationQuery(next);
    setSearchOpen(false);
    setSearchTerm('');
    setSuggestions([]);
  };

  const handleUseGeolocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const coords = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
        selectLocation(coords);
      },
      geoErr => {
        setLocating(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError('Location permission denied. Search for a city instead.');
        } else {
          setError('Unable to detect your location.');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  const updatedLabel = weather
    ? new Date(weather.fetchedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="glass-panel widget weather-container">
      <div className="widget-head weather-head">
        <button
          type="button"
          className="weather-location-trigger"
          onClick={() => setSearchOpen(open => !open)}
          title="Change location"
          aria-label="Change weather location"
        >
          <MapPin size={12} className="text-primary shrink-0" />
          <span className="truncate">
            {weather ? weather.location.name : 'Weather'}
          </span>
        </button>

        <div className="weather-head-actions">
          <Button
            variant="desktop"
            size="icon"
            className="size-6"
            title="Use current location"
            aria-label="Use current location"
            disabled={locating}
            onClick={handleUseGeolocation}
          >
            <LocateFixed size={12} className={locating ? 'animate-pulse text-primary' : ''} />
          </Button>
          <Button
            variant="desktop"
            size="icon"
            className="size-6"
            title="Search city"
            aria-label="Search city"
            onClick={() => setSearchOpen(open => !open)}
          >
            {searchOpen ? <X size={12} /> : <Search size={12} />}
          </Button>
          <Button
            variant="desktop"
            size="icon"
            className="size-6"
            title="Refresh weather"
            aria-label="Refresh weather"
            disabled={refreshing || loading}
            onClick={() => void loadWeather(locationQuery, { forceRefresh: true })}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {searchOpen && (
        <div className="weather-search-box">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (searchTerm.trim()) selectLocation(searchTerm.trim());
            }}
            className="weather-search-form"
          >
            <input
              ref={searchInputRef}
              type="text"
              className="weather-search-input"
              placeholder="Search city (e.g. Tokyo, London)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Search city for weather"
            />
            {locationQuery !== DEFAULT_WEATHER_LOCATION && (
              <button
                type="button"
                className="weather-reset-btn"
                onClick={() => selectLocation(DEFAULT_WEATHER_LOCATION)}
                title="Reset to Greater Noida"
              >
                Default
              </button>
            )}
          </form>

          {searching && <div className="weather-search-status">Searching cities…</div>}

          {suggestions.length > 0 && (
            <div className="weather-suggestions" role="listbox" aria-label="City suggestions">
              {suggestions.map(item => {
                const label = [item.name, item.region, item.country].filter(Boolean).join(', ');
                return (
                  <button
                    key={`${item.id}-${item.lat}-${item.lon}`}
                    type="button"
                    className="weather-suggestion-item"
                    onClick={() => selectLocation(`${item.name}, ${item.region || item.country}`)}
                  >
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="truncate text-[9px] text-muted-foreground">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loading && !weather ? (
        <div className="weather-loading" aria-busy="true">
          <div className="weather-widget">
            <div>
              <div className="temperature">--°</div>
              <p>Loading weather…</p>
            </div>
            <CloudSun size={38} strokeWidth={1.4} className="text-warning animate-pulse" />
          </div>
        </div>
      ) : error && !weather ? (
        <div className="weather-error">
          <div className="flex items-center gap-2 text-[11px] text-destructive">
            {isOffline ? <CloudOff size={14} /> : <CloudSun size={14} />}
            <span>{error}</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <Button
              variant="glass"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => void loadWeather(locationQuery, { forceRefresh: true })}
            >
              Retry
            </Button>
            {locationQuery !== DEFAULT_WEATHER_LOCATION && (
              <Button
                variant="desktop"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => selectLocation(DEFAULT_WEATHER_LOCATION)}
              >
                Greater Noida
              </Button>
            )}
          </div>
        </div>
      ) : weather ? (
        <>
          <div className="weather-widget">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <div className="temperature">{weather.current.tempC}°</div>
                <span className="text-[10px] text-muted-foreground">
                  H:{weather.today.maxTempC}° L:{weather.today.minTempC}°
                </span>
              </div>
              <p className="truncate">{weather.current.conditionText}</p>
            </div>
            {weather.current.conditionIcon ? (
              <img
                src={weather.current.conditionIcon}
                alt={weather.current.conditionText}
                width={44}
                height={44}
                className="weather-condition-img"
              />
            ) : (
              <CloudSun size={40} strokeWidth={1.4} className="text-warning shrink-0" />
            )}
          </div>

          <div className="weather-metrics">
            <div className="weather-metric" title="Feels like">
              <Thermometer size={11} className="text-warning" />
              <span>Feels {weather.current.feelsLikeC}°</span>
            </div>
            <div className="weather-metric" title="Humidity">
              <Droplets size={11} className="text-blue" />
              <span>{weather.current.humidity}%</span>
            </div>
            <div className="weather-metric" title="Wind speed">
              <Wind size={11} className="text-muted-foreground" />
              <span>{weather.current.windKph} km/h</span>
            </div>
          </div>

          {weather.forecast.length > 0 && (
            <div className="weather-forecast" aria-label="3-day forecast">
              {weather.forecast.map(day => (
                <div key={day.date} className="weather-forecast-day" title={day.conditionText}>
                  <span className="weather-day-name">{day.dayName}</span>
                  {day.conditionIcon ? (
                    <img
                      src={day.conditionIcon}
                      alt={day.conditionText}
                      width={22}
                      height={22}
                      className="mx-auto"
                    />
                  ) : (
                    <CloudSun size={16} className="mx-auto text-warning" />
                  )}
                  <span className="weather-day-temps">
                    {day.maxTempC}° <span className="text-muted-foreground">{day.minTempC}°</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-[9px] text-destructive mt-2 truncate" title={error}>
              {error}
            </div>
          )}
        </>
      ) : null}

      <div className="widget-footer">
        <span className="truncate">
          {isOffline
            ? 'Offline · Cached'
            : weather
              ? `${weather.location.region || weather.location.country}`
              : 'WeatherAPI'}
        </span>
        <span className="shrink-0">
          {updatedLabel ? `Updated ${updatedLabel}` : 'WeatherAPI'}
        </span>
      </div>
    </div>
  );
}

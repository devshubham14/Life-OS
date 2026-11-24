export const DEFAULT_WEATHER_LOCATION = 'Greater Noida, Uttar Pradesh, India';

export interface WeatherForecastDay {
  date: string;
  dayName: string;
  maxTempC: number;
  minTempC: number;
  conditionText: string;
  conditionIcon: string;
  chanceOfRain: number;
}

export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
    lat: number;
    lon: number;
  };
  current: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windKph: number;
    conditionText: string;
    conditionIcon: string;
    isDay: boolean;
    lastUpdated: string;
  };
  today: {
    maxTempC: number;
    minTempC: number;
  };
  forecast: WeatherForecastDay[];
  fetchedAt: number;
}

export interface WeatherLocationSuggestion {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}

export function normalizeWeatherIconUrl(iconUrl: string): string {
  if (!iconUrl) return '';
  if (iconUrl.startsWith('//')) return `https:${iconUrl}`;
  if (iconUrl.startsWith('http://')) return iconUrl.replace('http://', 'https://');
  return iconUrl;
}

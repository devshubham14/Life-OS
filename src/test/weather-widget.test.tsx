import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeatherWidget } from '@/components/desktop/weather-widget';
import { handleWeatherRequest } from '@/lib/weather-proxy';
import { DEFAULT_WEATHER_LOCATION } from '@/lib/weather';

const mockCurrentPayload = {
  location: {
    name: 'Greater Noida',
    region: 'Uttar Pradesh',
    country: 'India',
    localtime: '2026-11-25 01:00',
    lat: 28.47,
    lon: 77.5,
  },
  current: {
    temp_c: 21.4,
    feelslike_c: 20.8,
    humidity: 58,
    wind_kph: 11.2,
    is_day: 0,
    last_updated: '2026-11-25 01:00',
    condition: {
      text: 'Clear',
      icon: '//cdn.weatherapi.com/weather/64x64/night/113.png',
    },
  },
};

const mockForecastPayload = {
  ...mockCurrentPayload,
  forecast: {
    forecastday: [
      {
        date: '2026-11-25',
        day: {
          maxtemp_c: 27.1,
          mintemp_c: 13.4,
          daily_chance_of_rain: 0,
          condition: { text: 'Sunny', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' },
        },
      },
      {
        date: '2026-11-26',
        day: {
          maxtemp_c: 26.2,
          mintemp_c: 12.9,
          daily_chance_of_rain: 10,
          condition: { text: 'Partly cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
        },
      },
      {
        date: '2026-11-27',
        day: {
          maxtemp_c: 25.0,
          mintemp_c: 12.1,
          daily_chance_of_rain: 5,
          condition: { text: 'Clear', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' },
        },
      },
    ],
  },
};

describe('WeatherAPI integration', () => {
  const originalEnv = process.env['WEATHER_API_KEY'];

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalEnv === undefined) {
      delete process.env['WEATHER_API_KEY'];
    } else {
      process.env['WEATHER_API_KEY'] = originalEnv;
    }
  });

  it('proxies current.json and forecast.json server-side without exposing WEATHER_API_KEY', async () => {
    process.env['WEATHER_API_KEY'] = 'secret-test-key-123';

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/current.json')) {
        return new Response(JSON.stringify(mockCurrentPayload), { status: 200 });
      }
      if (url.includes('/forecast.json')) {
        return new Response(JSON.stringify(mockForecastPayload), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    const req = new Request('http://localhost/api/weather?refresh=1');
    const res = await handleWeatherRequest(req);
    const bodyText = await res.text();
    const body = JSON.parse(bodyText) as {
      weather: {
        location: { name: string };
        current: { tempC: number; feelsLikeC: number; humidity: number; windKph: number };
        today: { maxTempC: number; minTempC: number };
        forecast: Array<{ dayName: string }>;
      };
    };

    expect(res.status).toBe(200);
    expect(bodyText).not.toContain('secret-test-key-123');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('current.json');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(encodeURIComponent(DEFAULT_WEATHER_LOCATION));
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('forecast.json');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('days=3');

    expect(body.weather.location.name).toBe('Greater Noida');
    expect(body.weather.current.tempC).toBe(21);
    expect(body.weather.current.feelsLikeC).toBe(21);
    expect(body.weather.current.humidity).toBe(58);
    expect(body.weather.current.windKph).toBe(11);
    expect(body.weather.today.maxTempC).toBe(27);
    expect(body.weather.today.minTempC).toBe(13);
    expect(body.weather.forecast).toHaveLength(3);
  });

  it('renders current weather, metrics, and 3-day forecast in WeatherWidget', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          weather: {
            location: {
              name: 'Greater Noida',
              region: 'Uttar Pradesh',
              country: 'India',
              localtime: '2026-11-25 01:00',
              lat: 28.47,
              lon: 77.5,
            },
            current: {
              tempC: 21,
              feelsLikeC: 20,
              humidity: 58,
              windKph: 11,
              conditionText: 'Clear',
              conditionIcon: 'https://cdn.weatherapi.com/weather/64x64/night/113.png',
              isDay: false,
              lastUpdated: '2026-11-25 01:00',
            },
            today: { maxTempC: 27, minTempC: 13 },
            forecast: [
              {
                date: '2026-11-25',
                dayName: 'Today',
                maxTempC: 27,
                minTempC: 13,
                conditionText: 'Sunny',
                conditionIcon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png',
                chanceOfRain: 0,
              },
              {
                date: '2026-11-26',
                dayName: 'Thu',
                maxTempC: 26,
                minTempC: 13,
                conditionText: 'Partly cloudy',
                conditionIcon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
                chanceOfRain: 10,
              },
              {
                date: '2026-11-27',
                dayName: 'Fri',
                maxTempC: 25,
                minTempC: 12,
                conditionText: 'Clear',
                conditionIcon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png',
                chanceOfRain: 5,
              },
            ],
            fetchedAt: Date.now(),
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText('Greater Noida')).toBeInTheDocument();
    });
    expect(screen.getByText('21°')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('H:27° L:13°')).toBeInTheDocument();
    expect(screen.getByText('Feels 20°')).toBeInTheDocument();
    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.getByText('11 km/h')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });
});

import { createFileRoute } from '@tanstack/react-router';
import { handleWeatherRequest } from '@/lib/weather-proxy';

export const Route = createFileRoute('/api/weather')({
  server: {
    handlers: {
      GET: ({ request }) => handleWeatherRequest(request),
    },
  },
});

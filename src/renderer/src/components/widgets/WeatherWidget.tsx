import { useState, useEffect, useCallback, useRef } from "react";
import type { WeatherData } from "@shared/types";
import {
  fetchWeather,
  geolocate,
  type WeatherResponse,
} from "@renderer/lib/weather-client";
import "./WeatherWidget.css";

interface WeatherWidgetProps {
  widgetId: string;
  data: WeatherData;
}

function useCurrentTime(): string {
  const [time, setTime] = useState(() => formatTime(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setTime(formatTime(new Date())), 10000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function WeatherWidget({
  widgetId,
  data,
}: WeatherWidgetProps): React.JSX.Element {
  const [city, setCity] = useState(data.city);
  const [weather, setWeather] = useState<WeatherResponse | null>(
    data.lastFetch ? (data.lastFetch as unknown as WeatherResponse) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cityInput, setCityInput] = useState(data.city);
  const [geoLoading, setGeoLoading] = useState(false);
  const currentTime = useCurrentTime();
  const dataRef = useRef(data);
  dataRef.current = data;

  const loadWeather = useCallback(
    async (cityName: string) => {
      if (!cityName) return;
      setLoading(true);
      setError(null);
      try {
        const settings = await window.electronAPI.settings.get();
        if (!settings.weatherApiKey) {
          setError("请在托盘菜单的 Settings 中设置 OpenWeatherMap API Key");
          setLoading(false);
          return;
        }
        const result = await fetchWeather(
          cityName,
          dataRef.current.units,
          settings.weatherApiKey,
        );
        setWeather(result);
        window.electronAPI.widgets.updateData(widgetId, {
          ...dataRef.current,
          city: cityName,
          lastFetch: { ...result, fetchedAt: Date.now() },
        } as WeatherData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch weather",
        );
      } finally {
        setLoading(false);
      }
    },
    [widgetId],
  );

  // Auto-detect location on first load if no city is set
  useEffect(() => {
    if (!data.city && !city && !geoLoading) {
      setGeoLoading(true);
      geolocate()
        .then((geo) => {
          setCity(geo.city);
          setCityInput(geo.city);
        })
        .catch(() => {
          // Geolocation failed, show manual input
          setEditing(true);
        })
        .finally(() => setGeoLoading(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (city) {
      loadWeather(city);
      const interval = setInterval(() => loadWeather(city), 2 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [city, loadWeather]);

  const handleSubmitCity = (): void => {
    const trimmed = cityInput.trim();
    if (trimmed) {
      setCity(trimmed);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="weather-widget weather-widget--setup">
        <div className="weather-widget__setup-label">输入城市名称</div>
        <input
          type="text"
          className="weather-widget__input"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmitCity()}
          placeholder="例如 Shanghai, Beijing"
          autoFocus
        />
        <button className="weather-widget__btn" onClick={handleSubmitCity}>
          确认
        </button>
      </div>
    );
  }

  if ((loading || geoLoading) && !weather) {
    return (
      <div className="weather-widget weather-widget--loading">
        <div className="weather-widget__spinner" />
        <span>{geoLoading ? "正在定位..." : "加载中..."}</span>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="weather-widget weather-widget--error">
        <div className="weather-widget__error-text">{error}</div>
        <button
          className="weather-widget__btn"
          onClick={() => loadWeather(city)}
        >
          重试
        </button>
      </div>
    );
  }

  if (!weather) return <div className="weather-widget" />;

  const unitSymbol = data.units === "metric" ? "°C" : "°F";

  const WEATHER_EMOJI: Record<string, string> = {
    "01d": "☀️",
    "01n": "🌙",
    "02d": "🌤️",
    "02n": "🌤️",
    "03d": "🌥️",
    "03n": "🌥️",
    "04d": "☁️",
    "04n": "☁️",
    "09d": "🌧️",
    "09n": "🌧️",
    "10d": "🌦️",
    "10n": "🌧️",
    "11d": "⛈️",
    "11n": "⛈️",
    "13d": "🌨️",
    "13n": "🌨️",
    "50d": "🌫️",
    "50n": "🌫️",
  };

  return (
    <div className="weather-widget">
      <div className="weather-widget__time-row">
        <span className="weather-widget__time">{currentTime}</span>
        <span className="weather-widget__date">{formatDate(new Date())}</span>
      </div>
      <div className="weather-widget__header">
        <span
          className="weather-widget__city"
          onClick={() => setEditing(true)}
          title="点击切换城市"
        >
          {weather.city}
        </span>
        {loading && (
          <div className="weather-widget__spinner weather-widget__spinner--small" />
        )}
      </div>
      <div className="weather-widget__main">
        <span
          className="weather-widget__icon"
          role="img"
          aria-label={weather.description}
        >
          {WEATHER_EMOJI[weather.icon] ?? "🌡️"}
        </span>
        <div className="weather-widget__temp">
          {Math.round(weather.temp)}
          {unitSymbol}
        </div>
      </div>
      <div className="weather-widget__desc">{weather.description}</div>
      <div className="weather-widget__details">
        <span>
          体感 {Math.round(weather.feelsLike)}
          {unitSymbol}
        </span>
        <span>湿度 {weather.humidity}%</span>
        <span>风速 {weather.windSpeed} m/s</span>
      </div>
    </div>
  );
}

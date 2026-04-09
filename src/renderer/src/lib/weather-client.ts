export interface WeatherResponse {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  city: string;
}

export interface GeoLocation {
  city: string;
  lat: number;
  lon: number;
}

export async function geolocate(): Promise<GeoLocation> {
  const res = await fetch("http://ip-api.com/json/?fields=city,lat,lon");
  if (!res.ok) throw new Error("Geolocation failed");
  const data = await res.json();
  return { city: data.city, lat: data.lat, lon: data.lon };
}

export async function fetchWeather(
  city: string,
  units: string,
  apiKey: string,
): Promise<WeatherResponse> {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}&lang=zh_cn`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Weather API error (${res.status}): ${text}`);
  }
  const data = await res.json();
  return {
    temp: data.main.temp,
    feelsLike: data.main.feels_like,
    humidity: data.main.humidity,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    windSpeed: data.wind.speed,
    city: data.name,
  };
}

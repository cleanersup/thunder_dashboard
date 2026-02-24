/**
 * GeolocationService — wraps the Web Geolocation API.
 * Replaces @capacitor/geolocation for web.
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 30_000,
};

/**
 * Returns the device's current geographic position.
 * @param options - Optional PositionOptions to override defaults
 * @returns Resolved GeoPosition
 * @throws GeolocationPositionError if permission denied or unavailable
 * @example
 * const pos = await GeolocationService.getCurrentPosition();
 * console.log(pos.latitude, pos.longitude);
 */
function getCurrentPosition(options?: PositionOptions): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      reject,
      { ...DEFAULT_OPTIONS, ...options },
    );
  });
}

/**
 * Watches the device's position and calls the callback on each update.
 * @param callback - Called with the new position on each update
 * @param onError - Called if an error occurs
 * @param options - Optional PositionOptions
 * @returns Watch ID — pass to clearWatch() to stop watching
 */
function watchPosition(
  callback: (position: GeoPosition) => void,
  onError?: (error: GeolocationPositionError) => void,
  options?: PositionOptions,
): number {
  return navigator.geolocation.watchPosition(
    ({ coords }) =>
      callback({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      }),
    onError,
    { ...DEFAULT_OPTIONS, ...options },
  );
}

/**
 * Stops watching a position by its watch ID.
 * @param watchId - ID returned by watchPosition()
 */
function clearWatch(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}

export const GeolocationService = { getCurrentPosition, watchPosition, clearWatch };

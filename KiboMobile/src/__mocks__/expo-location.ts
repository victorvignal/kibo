export const requestForegroundPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getCurrentPositionAsync = jest.fn().mockResolvedValue({
  coords: { latitude: -23.5505, longitude: -46.6333, altitude: 750 },
  timestamp: Date.now(),
});

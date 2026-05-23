export const Accelerometer = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeAllListeners: jest.fn(),
  setUpdateInterval: jest.fn(),
};

export const Gyroscope = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeAllListeners: jest.fn(),
  setUpdateInterval: jest.fn(),
};

export const Magnetometer = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeAllListeners: jest.fn(),
  setUpdateInterval: jest.fn(),
};

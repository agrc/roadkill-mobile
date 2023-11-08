export const Accuracy = {
  Low: 2,
};

const mocks = {
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
};

export function mock({ getLastKnownPositionAsync, getCurrentPositionAsync }) {
  if (getLastKnownPositionAsync) {
    mocks.getLastKnownPositionAsync.mockImplementation(
      getLastKnownPositionAsync,
    );
  }
  if (getCurrentPositionAsync) {
    mocks.getCurrentPositionAsync.mockImplementation(getCurrentPositionAsync);
  }
}

export async function getLastKnownPositionAsync() {
  return mocks.getLastKnownPositionAsync();
}

export async function getCurrentPositionAsync() {
  return mocks.getCurrentPositionAsync();
}

// got this idea from: https://forums.expo.dev/t/how-to-setstate-from-within-taskmanager/26630/5?u=agrc

function BackgroundLocationService() {
  let subscriber;

  return {
    subscribe: (callback) => (subscriber = callback),
    unsubscribe: () => {
      subscriber = null;
    },
    notify: (location) => subscriber && subscriber(location),
  };
}

export default new BackgroundLocationService();

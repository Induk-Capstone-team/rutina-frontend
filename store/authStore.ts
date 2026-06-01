export const authStore = {
  isLoggedIn: false,
  listeners: new Set<() => void>(),
  setLoggedIn(value: boolean) {
    this.isLoggedIn = value;
    this.listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
};

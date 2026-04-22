export const checkAuthState = () => {
  const advStorage = new AdvStorage();
  if (!advStorage.has('userInfo')) {
    return false;
  } else {
    return true;
  }
};

export const sleep = (time: number): Promise<void> => {
  return new Promise((resolve: () => void) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};

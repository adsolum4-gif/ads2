export const fadeIn = (direction = "up", delay = 0) => ({
  initial: {
    y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
    x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
    opacity: 0,
  },
  animate: {
    y: 0,
    x: 0,
    opacity: 1,
    transition: { duration: 0.5, delay: typeof delay === "number" ? delay * 0.1 : 0 },
  },
});

export const slideIn = (direction = "left", delay = 0) => fadeIn(direction, delay);

export const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
};

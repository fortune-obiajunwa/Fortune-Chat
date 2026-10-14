const generateFortuneId = (): string => {
  const firstPart = Math.floor(
    1000 + Math.random() * 9000
  );

  const secondPart = Math.floor(
    1000 + Math.random() * 9000
  );

  const thirdPart = Math.floor(
    10 + Math.random() * 90
  );

  return `${firstPart}${secondPart}${thirdPart}`;
};

export default generateFortuneId;
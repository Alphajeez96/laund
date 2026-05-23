const logger = (scope: string, data: unknown) => {
  console.log(`${scope}:::`);
  console.dir(data, {depth: null});
};

export default logger;

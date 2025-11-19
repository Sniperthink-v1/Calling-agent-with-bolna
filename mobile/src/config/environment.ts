// Environment configuration
const ENV = {
  dev: {
    apiUrl: 'https://agentbackend.sniperthink.com/api',
  },
  staging: {
    apiUrl: 'https://agentbackend.sniperthink.com/api',
  },
  prod: {
    apiUrl: 'https://agentbackend.sniperthink.com/api',
  },
};

const getEnvVars = (env = process.env.NODE_ENV || 'development') => {
  if (env === 'production') return ENV.prod;
  if (env === 'staging') return ENV.staging;
  return ENV.dev;
};

export default getEnvVars();

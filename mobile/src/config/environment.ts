// Environment configuration
const ENV = {
  dev: {
    apiUrl: 'https://a640c8859563.ngrok-free.app/api',
  },
  staging: {
    apiUrl: 'https://your-staging-api.com/api',
  },
  prod: {
    apiUrl: 'https://your-production-api.com/api',
  },
};

const getEnvVars = (env = process.env.NODE_ENV || 'development') => {
  if (env === 'production') return ENV.prod;
  if (env === 'staging') return ENV.staging;
  return ENV.dev;
};

export default getEnvVars();

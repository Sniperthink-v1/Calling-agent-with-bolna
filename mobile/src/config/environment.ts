// Environment configuration
const ENV = {
  dev: {
    apiUrl: 'https://calling-agent-with-bolna-production.up.railway.app/api',
  },
  staging: {
    apiUrl: 'https://calling-agent-with-bolna-production.up.railway.app/api',
  },
  prod: {
    apiUrl: 'https://calling-agent-with-bolna-production.up.railway.app/api',
  },
};

const getEnvVars = (env = process.env.NODE_ENV || 'development') => {
  if (env === 'production') return ENV.prod;
  if (env === 'staging') return ENV.staging;
  return ENV.dev;
};

export default getEnvVars();

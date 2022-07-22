const _ = require('lodash');
const jwt = require('jsonwebtoken');

//const defaultJwtOptions = { expiresIn: '30d' };
const defaultJwtOptions = {};

const getTokenOptions = () => {
  const { options, secret } = strapi.config.get('admin.auth', {});

  return {
    secret,
    options: _.merge(defaultJwtOptions, options),
  };
};

const createJwtToken = client => {
  const { options, secret } = getTokenOptions();

  return jwt.sign({ id: client.id, name: client.name }, secret, options);
};

const decodeJwtToken = token => {
  const { secret } = getTokenOptions();

  try {
    const payload = jwt.verify(token, secret);
    return { payload, isValid: true };
  } catch (err) {
    return { payload: null, isValid: false };
  }
};

module.exports = {
  createJwtToken,
  decodeJwtToken,
};
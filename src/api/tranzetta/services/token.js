const Encryter = require('./utils/encrypter');

class Token {
    constructor(client) {
        this.client = client;
    }

    async generateToken() {
        let token = Encryter.createJwtToken(this.client);

        return token;
    }

    async verifyToken(token) {
      let result = Encryter.decodeJwtToken(token);

      return result;
  }

}

module.exports =
  ({ strapi }) =>
  (client) => {
    return new Token(client);
  };
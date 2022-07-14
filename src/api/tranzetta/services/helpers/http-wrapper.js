class HttpWrapper {
  async get(entity, query) {
    const response = await this.axios.get(entity, {
      params: query,
    });

    return response.data;
  }

  async post(entity, data) {
    const response = await this.axios.post(entity, data);
    return response.data;
  }

  async put(entity, data, query) {
    const response = this.axios.put(entity, data, {
      params: query,
    });

    return response;
  }

  async delete(entity, query) {
    const response = this.axios.delete(entity, {
      params: query,
    });

    return response;
  }

  async request(axiosConfig) {
    const response = await this.axios(axiosConfig);
    return response.data;
  }
}

module.exports = HttpWrapper;

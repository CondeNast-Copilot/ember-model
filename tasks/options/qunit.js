module.exports = {
  cli: ['tests/index.html'],
  puppeteer: {
    args: [
      "--no-sandbox"
    ]
  },
  development: {
    options: {
      urls: ['http://localhost:8000/tests/runner.html']
    }
  }
};

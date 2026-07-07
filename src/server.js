const { createServer } = require('./app');

const port = Number(process.env.PORT) || 3000;
const server = createServer();

server.listen(port, () => {
  console.log(`Phone Book API listening on port ${port}`);
});

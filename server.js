const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DropBox Lite] Server running at http://localhost:${PORT}`);
  });
}

startServer();

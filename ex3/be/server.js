const cors = require('cors');
const express = require('express');
const weatherRoutes = require('./routes/weather.routes');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());
app.use('/api/v1/weather', weatherRoutes);

app.use((error, _req, res, _next) => {
  console.error(error.message);
  if (error.code === 'ECONNABORTED') {
    return res.status(504).json({
      success: false,
      message: 'The weather service took too long to respond. Please try again.'
    });
  }
  res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : 'Could not get the weather right now.'
  });
});

app.listen(PORT, () => {
  console.log(`Weather API running at http://localhost:${PORT}`);
});

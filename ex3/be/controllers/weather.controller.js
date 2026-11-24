const { getCurrentWeather } = require('../services/weather.service');

exports.getWeather = async (req, res, next) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  if (!city) {
    return res.status(400).json({
      success: false,
      message: 'The city query parameter is required.'
    });
  }

  try {
    const weather = await getCurrentWeather(city);
    res.status(200).json({ success: true, data: weather });
  } catch (error) {
    next(error);
  }
};

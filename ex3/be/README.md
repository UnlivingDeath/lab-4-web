# Exercise 3 – External Weather API

## Run

```powershell
cd LAB4_exercise3_BE
npm install
npm start
```

The API listens on `http://localhost:5001`. Request a city with:

```text
GET /api/v1/weather?city=Ho%20Chi%20Minh
```

Successful requests return `success` and `data` containing the resolved city,
temperature in Celsius, wind speed in km/h, and observation time. Unknown cities
return `404`; missing city names return `400`; exhausted Axios timeouts return
`504`.

Successful weather results are cached by normalized city name for five minutes.
Each request logs its cache status and elapsed time. Failed external calls are
retried once, except for not-found responses. Set `WEATHER_TIMEOUT_MS` to a small
number such as `1` when testing the timeout response.

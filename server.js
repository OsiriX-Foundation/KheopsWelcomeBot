/* eslint no-console: ["error", { allow: ["info", "warn", "error"] }] */

const axios = require('axios');
const http = require('http');
const url = require('url');
const fs = require('fs');

const hostname = '0.0.0.0';
const port = 8080;

const authorizationhost = 'kheopsauthorization';
const authorizationPath = '/authorization';
const authorizationPort = 8080;

const albumID = 'y7wTTbODmM';

const welcomeBotToken = fs.readFileSync('/run/secrets/welcomebot_token', 'utf8').trim();

const authorizationAPI = axios.create({
  baseURL: `http://${authorizationhost}:${authorizationPort}${authorizationPath}`,
  timeout: 1000,
  headers: { Authorization: `Bearer ${welcomeBotToken}` },
});

const server = http.createServer((request, res) => {
  if (request.method === 'POST') {
    console.info(`request for ${request.url}`);

    const { user } = url.parse(request.url, true).query;

    if (user.endsWith('@etu.unige.ch')) {
      authorizationAPI.put(`/albums/${albumID}/users/${user}`);
    }

    res.statusCode = 204;
    res.end();
  } else {
    res.statusCode = 405;
    res.end();
  }
});

server.listen(port, hostname, () => {
  console.info(`Server running at http://${hostname}:${port}/`);
});

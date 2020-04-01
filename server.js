/* eslint no-console: ["error", { allow: ["info", "warn", "error"] }] */

const axios = require('axios');
const http = require('http');
const url = require('url');
const fs = require('fs');

const hostname = '0.0.0.0';
const port = 8080;

const authorizationhost = process.env.KHEOPS_AUTHORIZATION_HOST;
const authorizationPath = process.env.KHEOPS_AUTHORIZATION_PATH;
const authorizationPort = process.env.KHEOPS_AUTHORIZATION_PORT;

const albumID = process.env.STUDENT_SHARING_ALBUM_ID;

const welcomeBotToken = fs.readFileSync('/run/secrets/welcomebot_token', 'utf8').trim();

const authorizationAPI = axios.create({
  baseURL: `http://${authorizationhost}:${authorizationPort}${authorizationPath}`,
  timeout: 1000,
  headers: { Authorization: `Bearer ${welcomeBotToken}` },
});

const server = http.createServer((request, res) => {
  if (request.method === 'POST') {
    console.info(`request for ${request.url}`);

    const { email } = url.parse(request.url, true).query;
    console.info(`Email is ${email}`);

    if (email.endsWith('@etu.unige.ch') || email.endsWith('@unige.ch')) {
      authorizationAPI.put(`/albums/${albumID}/users/${email}`).then((response) => {
        console.info(`response code: ${response.statusCode}`);
      }).catch((error) => {
        console.error(error);
      });
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

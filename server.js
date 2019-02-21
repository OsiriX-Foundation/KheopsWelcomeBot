/* eslint no-console: ["error", { allow: ["info", "warn", "error"] }] */

const http = require('http');
const url = require('url');
const fs = require('fs');
const querystring = require('querystring');
// const fspath = require('path');

const hostname = '0.0.0.0';
const port = 8080;

const authorizationhost = 'kheopsauthorization';
// const authorizationhost = 'localhost';
const authorizationPath = '/authorization';
const authorizationPort = 8080;

// let filePath = fspath.join(__dirname, 'welcomebot_token');
// let welcomeBotToken = fs.readFileSync(filePath);
const welcomeBotToken = fs.readFileSync('/run/secrets/welcomebot_token');

function optionsForPath(path, method, data) {
  const options = {
    host: authorizationhost,
    port: authorizationPort,
    path: `${authorizationPath}${path}`,
    method,
    headers: {
      Authorization: `Bearer ${welcomeBotToken}`,
    },
  };

  if (data) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  return options;
}

const server = http.createServer((request, res) => {
  if (request.method === 'POST') {
    console.info(`request for ${request.url}`);

    const { user } = url.parse(request.url, true).query;

    const requestStack = {
      paths: [],
      methods: [],
      data: [],

      callRequests(finished) {
        const method = this.methods.pop();
        const path = this.paths.pop();
        const sendData = this.data.pop();
        if (path) {
          const sendRequest = http.request(optionsForPath(path, method, sendData)).once('response', () => {
            this.callRequests(finished);
          });

          if (sendData) {
            sendRequest.write(querystring.stringify(sendData));
          }

          sendRequest.end();
        } else {
          finished();
        }
      },

      push(method, path, sendData) {
        this.paths.push(path);
        this.methods.push(method);
        if (sendData) {
          this.data.push(sendData);
        } else {
          this.data.push(null);
        }
      },
    };

    requestStack.push('PUT', `/studies/1.2.3.4.5.6/users/${user}`);
    requestStack.push('PUT', `/albums/H4fb4/users/${user}`);

    requestStack.callRequests(() => {
      res.statusCode = 204;
      res.end();
    });
  } else {
    res.statusCode = 405;
    res.end();
  }
});

server.listen(port, hostname, () => {
  console.info(`Server running at http://${hostname}:${port}/`);
});

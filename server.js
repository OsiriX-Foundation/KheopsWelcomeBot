/* eslint no-console: ["error", { allow: ["info", "warn", "error"] }] */

const http = require('http');
const url = require('url');
const fs = require('fs');
const querystring = require('querystring');

const hostname = '0.0.0.0';
const port = 8080;

const authorizationhost = 'kheopsauthorization';
const authorizationPath = '/authorization';
const authorizationPort = 8080;

const albumSharingSource = 'eDj87AdlKo';
const inboxSharingSource = 'ARIFqZui24';

const welcomeBotToken = fs.readFileSync('/run/secrets/welcomebot_token', 'utf8').trim();

const optionsForPath = (path, method, data) => {
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
};

const server = http.createServer((request, res) => {
  if (request.method === 'POST') {
    console.info(`request for ${request.url}`);

    const { user } = url.parse(request.url, true).query;

    const requestStack = {
      methods: [],
      paths: [],
      data: [],
      callbacks: [],

      callRequests(finished) {
        const method = this.methods.shift();
        const path = this.paths.shift();
        const sendData = this.data.shift();
        const callback = this.callbacks.shift();

        if (path) {
          const sendRequest = http.request(optionsForPath(path, method, sendData), (response) => {
            let data = '';

            response.on('data', (chunk) => {
              data += chunk;
            });

            response.on('end', () => {
              if (callback) {
                callback(JSON.parse(data));
              }
              this.callRequests(finished);
            });
          }).on('error', (err) => {
            console.info(`Error: ${err.message}`);
          });

          if (sendData) {
            sendRequest.write(querystring.stringify(sendData));
          }

          sendRequest.end();
        } else {
          finished();
        }
      },

      push(method, path, sendData = null, callback = null) {
        this.methods.push(method);
        this.paths.push(path);
        this.data.push(sendData);
        this.callbacks.push(callback);
      },
    };

    let albumID = '';

    requestStack.push('GET', `/studies?album=${albumSharingSource}`, null, (qidoResponse) => {
      requestStack.push('POST', '/albums', {
        name: 'Album created Welcom Bot',
        description: 'This album was automatically created and shared with you by the Welcome Bot.',
        addUser: true,
        downloadSeries: true,
        sendSeries: true,
        deleteSeries: true,
        addSeries: true,
        writeComments: true,
      }, (responseData) => {
        albumID = responseData.album_id;
      });
      requestStack.push('PUT', `/albums/${albumID}/users/${user}`);
      requestStack.push('PUT', `/albums/${albumID}/users/${user}/admin`);

      qidoResponse.forEach((element) => {
        const studyInstanceUID = element['0020000D'].Value[0];
        requestStack.push('PUT', `/studies/${studyInstanceUID}/albums/${albumID}`, {
          album: albumSharingSource,
        });
      });

      requestStack.push('DELETE', `/albums/${albumID}/users/welcomebot%40kheops.online`);
    });

    requestStack.push('GET', `/studies?album=${inboxSharingSource}`, null, (qidoResponse) => {
      qidoResponse.forEach((element) => {
        const studyInstanceUID = element['0020000D'].Value[0];
        requestStack.push('PUT', `/studies/${studyInstanceUID}/users/${user}`, {
          album: inboxSharingSource,
        });
      });
    });


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

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

const albumSharingSource = 'dTxCc6OJyG';
const inboxSharingSource = 'XxDVxxK3Lm';

const welcomeBotToken = fs.readFileSync('/run/secrets/welcomebot_token', 'utf8').trim();

const optionsForPath = (path, method, accept, data) => {
  const options = {
    host: authorizationhost,
    port: authorizationPort,
    path: `${authorizationPath}${path}`,
    method,
    headers: {
      Authorization: `Bearer ${welcomeBotToken}`,
      Accept: accept,
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
      accepts: [],
      paths: [],
      data: [],
      callbacks: [],

      callRequests(finished) {
        const method = this.methods.shift();
        const accept = this.accepts.shift();
        const path = this.paths.shift();
        const sendData = this.data.shift();
        const callback = this.callbacks.shift();

        if (path) {
          const sendRequest = http.request(optionsForPath(path, method, accept, sendData),
            (response) => {
              let data = '';

              response.on('data', (chunk) => {
                console.info(`Recieved data for ${method} ${path}\chunk: ${chunk}`);
                data += chunk;
              });

              response.on('end', () => {
                console.info(`Finished calling ${method} ${path}\ndata: ${data}`);
                if (callback) {
                  callback(JSON.parse(data));
                }
                this.callRequests(finished);
              });
            }).on('error', (err) => { console.info(`Error: ${err.message}`); });

          if (sendData) {
            sendRequest.write(querystring.stringify(sendData));
          }

          sendRequest.end();
        } else {
          finished();
        }
      },

      push(method, accept, path, sendData = null, callback = null) {
        this.methods.push(method);
        this.accepts.push(accept);
        this.paths.push(path);
        this.data.push(sendData);
        this.callbacks.push(callback);
      },
    };


    requestStack.push('GET', 'application/dicom+json', `/studies?album=${albumSharingSource}`, null, (qidoResponse) => {
      requestStack.push('POST', 'application/json', '/albums', {
        name: 'Welcome Album',
        description: 'This album was automatically created and shared with you by the Welcome Bot.',
        addUser: true,
        downloadSeries: true,
        sendSeries: true,
        deleteSeries: true,
        addSeries: true,
        writeComments: true,
      }, (responseData) => {
        console.info(`created the new album: ${JSON.stringify(responseData)}`);
        const albumID = responseData.album_id;
        requestStack.push('PUT', '*/*', `/albums/${albumID}/users/${user}`);
        requestStack.push('PUT', '*/*', `/albums/${albumID}/users/${user}/admin`);

        qidoResponse.forEach((element) => {
          const studyInstanceUID = element['0020000D'].Value[0];
          requestStack.push('PUT', '*/*', `/studies/${studyInstanceUID}/albums/${albumID}`, {
            album: albumSharingSource,
          });
        });

        requestStack.push('DELETE', '*/*', `/albums/${albumID}/users/welcomebot%40kheops.online`);
      });
    });

    requestStack.push('GET', 'application/dicom+json', `/studies?album=${inboxSharingSource}`, null, (qidoResponse) => {
      qidoResponse.forEach((element) => {
        const studyInstanceUID = element['0020000D'].Value[0];
        requestStack.push('PUT', '*/*', `/studies/${studyInstanceUID}/users/${user}`, {
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

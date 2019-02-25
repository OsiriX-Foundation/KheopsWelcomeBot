'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
// const path = require('path');

const hostname = '0.0.0.0';
const port = 8080;

const authorizationhost = 'kheopsauthorization';
// const authorizationhost = 'localhost';
const authorizationPath = '/authorization';

// let filePath = path.join(__dirname, 'welcomebot_token');
// let welcomeBotToken = fs.readFileSync(filePath);
const welcomeBotToken = fs.readFileSync('/run/secrets/welcomebot_token');

function putOptionsForPath(putPath) {
    return {
        host: authorizationhost,
        port: '8080',
        path: `${authorizationPath}${putPath}`,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${welcomeBotToken}`,
        },
    };
}

const server = http.createServer((request, res) => {
    if (request.method == 'POST') {
        console.log(`request for ${request.url}`);

        const user = url.parse(request.url, true).query.user;

        const requestStack = {
            paths: [],
            callRequests (finished) {
                const path = this.paths.pop()
                if (path) {
                    http.request(putOptionsForPath(path)).once('response', () => {
                        this.callRequests(finished);
                    }).end();
                } else {
                    finished();
                }
            }
        }

        requestStack.paths.push(`/studies/2.16.840.1.113669.632.20.1211.10000314223/users/${user}`);
        requestStack.paths.push(`/albums/l1nNRn3MX0/users/${user}`);

        requestStack.callRequests(() => {
            res.statusCode = 204;
            res.end();        
        })
    } else {
        res.statusCode = 405;
        res.end();
    }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
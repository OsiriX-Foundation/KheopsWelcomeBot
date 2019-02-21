'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const hostname = '0.0.0.0';
const port = 8085;

let filePath = path.join(__dirname, 'welcomebot_token');
let welcomeBotToken = fs.readFileSync(filePath);

function putOptionsForPath(putPath) {
    return {
        host: '127.0.0.1',
        port: '8087',
        path: putPath,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${welcomeBotToken}`,
        },
    };
}

const server = http.createServer((request, res) => {
    if (request.method == 'POST') {
        let user = url.parse(request.url, true).query.user;

        let requestStack = {
            paths: [],
            callRequests (finished) {
                let path = this.paths.pop()
                if (path) {
                    http.request(putOptionsForPath(path)).once('response', () => {
                        this.callRequests(finished);
                    }).end();
                } else {
                    finished();
                }
            }
        }

        requestStack.paths.push(`/studies/1.2.3.4.5.6/users/${user}`);
        requestStack.paths.push(`/albums/H4fb4/users/${user}`);

        requestStack.callRequests(() => {
            res.statusCode = 204;
            res.end();        
        })
    } else {
        res.statusCode = 405;
        res.end();
    }
});

const dummyServer = http.createServer((request, res) => {
    console.log(request.url);
    res.statusCode = 202;
    res.end();        
});
dummyServer.listen(8087, hostname, () => {  });

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
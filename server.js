var express = require('express')
var fs = require('fs')
var https = require('https')
var app = express()

app.use(express.static('dist'));


var server = https.createServer({
  key: fs.readFileSync('/etc/ssl/private/ssl-cert-snakeoil.key'),
  cert: fs.readFileSync('/etc/ssl/certs/ssl-cert-snakeoil.pem')
}, app)
.listen(443, function () {
  console.log('Example app listening on port 443! Go to https://localhost:443/')
})

var io = require('socket.io').listen(server);

io.on('connection', function(socket){
    console.log('a user connected');
});
  
  
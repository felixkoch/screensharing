var express = require('express')
var fs = require('fs')
var https = require('https')
var app = express()
const mediasoup = require('mediasoup');

let mediasoupRouter;
let producerTransport;
let consumerTransport;

(async () => {
  await runMediasoupWorker()
})();


app.use(express.static('dist'));



var server = https.createServer({
  key: fs.readFileSync('/etc/ssl/private/ssl-cert-snakeoil.key'),
  cert: fs.readFileSync('/etc/ssl/certs/ssl-cert-snakeoil.pem')
}, app)
  .listen(443, function () {
    console.log('Example app listening on port 443! Go to https://localhost:443/')
  })

var io = require('socket.io').listen(server);

io.on('connection', function (socket) {
  console.log('a user connected');

  socket.on('getRouterRtpCapabilities', (data, callback) => {
    console.log('getRouterRtpCapabilities');
    callback(mediasoupRouter.rtpCapabilities);
  });

  socket.on('createProducerTransport', async (data, callback) => {
    console.log('createProducerTransport');
    console.log(data)
    const { transport, params } = await createWebRtcTransport();
    producerTransport = transport;
    callback(params);
  });

});



async function runMediasoupWorker() {
  const worker = await mediasoup.createWorker({
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
      // 'rtx',
      // 'bwe',
      // 'score',
      // 'simulcast',
      // 'svc'
    ],
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  worker.on('died', () => {
    console.error('mediasoup Worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
    setTimeout(() => process.exit(1), 2000);
  });

  const mediaCodecs =
    [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters:
        {
          'x-google-start-bitrate': 1000
        }
      },
    ];
  mediasoupRouter = await worker.createRouter({ mediaCodecs });

}

async function createWebRtcTransport()
{
  console.log('createWebRtcTransport');

  const maxIncomingBitrate = 1500000;
  const initialAvailableOutgoingBitrate = 1000000;

  const transport = await mediasoupRouter.createWebRtcTransport({
    listenIps: [{ip: '139.59.155.242', announcedIp: null}],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate,
  });

  await transport.setMaxIncomingBitrate(maxIncomingBitrate);

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    },
  };
}
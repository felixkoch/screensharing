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

let roomMembers = {};

io.on('connection', function (socket) {
  console.log('a user connected');


  socket.on('JOIN', (data) => {
    console.log(`JOIN: ${socket.id} joins ${data}`);
    socket.join(data);

    //socketRoomMap[socket.id] = data;
    if(typeof roomMembers[data] == 'undefined')
    {
      roomMembers[data] = [];
    }
    
    roomMembers[data].push(socket.id);

    //socket.emit('MEMBERS', roomMembers[data]);
    io.to(data).emit('MEMBERS', roomMembers[data]);
  });

  

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

  socket.on('connectProducerTransport', async (data, callback) => {
    console.log('connectProducerTransport');
    await producerTransport.connect({ dtlsParameters: data.dtlsParameters });
    callback();
  });

  socket.on('produce', async (data, callback) => {
    console.log('produce');
    const {kind, rtpParameters} = data;
    producer = await producerTransport.produce({ kind, rtpParameters });
    callback({ id: producer.id });

    // inform clients about new producer
    socket.broadcast.emit('newProducer');
  });

  socket.on('createConsumerTransport', async (data, callback) => {
    console.log('createConsumerTransport');
    const { transport, params } = await createWebRtcTransport();
    consumerTransport = transport;
    callback(params);
  });

  socket.on('connectConsumerTransport', async (data, callback) => {
    console.log('connectConsumerTransport')
    await consumerTransport.connect({ dtlsParameters: data.dtlsParameters });
    callback();
  });

  socket.on('consume', async (data, callback) => {
    console.log('consume');
    callback(await createConsumer(producer, data.rtpCapabilities));
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
      /*
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters:
        {
          'x-google-start-bitrate': 1000
        }
      },
      */
      {
        kind       : "video",
        mimeType   : "video/H264",
        clockRate  : 90000,
        parameters :
        {
          "packetization-mode"      : 1,
          "profile-level-id"        : "42e01f",
          "level-asymmetry-allowed" : 1
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

async function createConsumer(producer, rtpCapabilities) {
  console.log('createConsumer');
  if (!mediasoupRouter.canConsume(
    {
      producerId: producer.id,
      rtpCapabilities,
    })
  ) {
    console.error('can not consume');
    return;
  }
  try {
    consumer = await consumerTransport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: false,
    });
  } catch (error) {
    console.error('consume failed', error);
    return;
  }

  return {
    producerId: producer.id,
    id: consumer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    type: consumer.type,
    producerPaused: consumer.producerPaused
  };
}
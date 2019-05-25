import mediasoup from 'mediasoup-client';
import io from 'socket.io-client';

const $ = document.querySelector.bind(document);

$('#publish').addEventListener('click', publish);
$('#subscribe').addEventListener('click', subscribe);

const socket = io('https://139.59.155.242');
let device;
let producer;

socket.on('connect', () => {
    console.log('connect')

    //const data = await socket.request('getRouterRtpCapabilities');
    // await loadDevice(data);

    socket.emit('getRouterRtpCapabilities', null, loadDevice)
    console.log('nachemit');
});

function loadDevice(routerRtpCapabilities) {
    console.log('loadDevice');
    console.log(routerRtpCapabilities)
    try {
        device = new mediasoup.Device();
    } catch (error) {
        if (error.name === 'UnsupportedError') {
            console.error('browser not supported');
        }
    }
    device.load({ routerRtpCapabilities });
    console.log(device)
}

function publish() {
    console.log('publish');

    let transport;

    socket.emit('createProducerTransport', {
        forceTcp: false,
        rtpCapabilities: device.rtpCapabilities,
    }, onProducerTransport)

}

async function onProducerTransport(data) {
    console.log('onProducerTransport');
    console.log(data);

    const transport = device.createSendTransport(data)




    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        console.log('connect')
        socket.emit('connectProducerTransport', { dtlsParameters }, callback)
    })

    transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        console.log('produce');
        console.log({
            transportId: transport.id,
            kind,
            rtpParameters,
        });
        socket.emit('produce', {
            transportId: transport.id,
            kind,
            rtpParameters,
        }, (id) => {
            console.log(id);
            callback({ id });
        });

    });

    transport.on('connectionstatechange', (state) => {
        console.log('connectionstatechange');
        console.log(state);
        console.log(stream);
        switch (state) {
            case 'connecting':
                break;

            case 'connected':
                console.log(stream);
                $('#localVideo').srcObject = stream;
                break;

            case 'failed':
                transport.close();
                break;

            default: break;
        }
    })

    let stream;
    stream = await startWebcam(transport);
    console.log(stream);
}

async function startWebcam(transport) {
    console.log('startWebcam')

    let stream = await navigator.mediaDevices.getUserMedia({ video: true });

    console.log(stream);
    const track = stream.getVideoTracks()[0];
    console.log(track);
    producer = await transport.produce({ track });
    console.log('localVideo');
    console.log($('#localVideo'))

    
    return stream;
}

async function subscribe() {
    const data = await socket.request('createConsumerTransport', {
      forceTcp: false,
    });

  }

function onConsumerTransport()
{
    console.log('onConsumerTransport');

      
    const transport = device.createRecvTransport(data);
    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      socket.request('connectConsumerTransport', {
        transportId: transport.id,
        dtlsParameters
      })
        .then(callback)
        .catch(errback);
    });
  
    transport.on('connectionstatechange', (state) => {
      switch (state) {
        case 'connecting':
          txtSubscription.innerHTML = 'subscribing...';
          btnSubscribe.disabled = true;
          break;
  
        case 'connected':
          document.querySelector('#remote_video').srcObject = stream;
          txtSubscription.innerHTML = 'subscribed';
          btnSubscribe.disabled = true;
          break;
  
        case 'failed':
          transport.close();
          txtSubscription.innerHTML = 'failed';
          btnSubscribe.disabled = false;
          break;
  
        default: break;
      }
    });
  
    const stream = await consume(transport);
}
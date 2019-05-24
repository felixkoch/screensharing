import mediasoup from 'mediasoup-client';
import io from 'socket.io-client';

const $ = document.querySelector.bind(document);

$('#publish').addEventListener('click', publish);

const socket = io('https://139.59.155.242');
let device;

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

function onProducerTransport(data)
{
    console.log('onProducerTransport');
    console.log(data);

    const transport = device.createSendTransport(data)

    transport.on('connect', () => console.log('connect'))
    
    transport.on('produce', () => console.log('produce'));

    startWebcam(transport);
}

function startWebcam(transport)
{
    console.log('startWebcam')

    const stream = navigator.mediaDevices.getUserMedia({ video: true });

    console.log(stream);



}
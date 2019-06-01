import 'babel-polyfill'
//import adapter from 'webrtc-adapter';
import mediasoup from 'mediasoup-client';
//const mediasoup = require('mediasoup-client');
import Edge11 from 'mediasoup-client/lib/handlers/Edge11'
import Firefox60 from 'mediasoup-client/lib/handlers/Firefox60'
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
            console.log(error);
            console.log('EDGE');
        }
        console.log('EDGE');
    }
    device.load({ routerRtpCapabilities });
    //console.log(device)
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

    //let stream = await navigator.mediaDevices.getUserMedia({ video: true });
    //let stream = await navigator.mediaDevices.getDisplayMedia({
    let stream = await navigator.mediaDevices.getUserMedia({
        video: true,
    });

    console.log(stream);
    const track = stream.getVideoTracks()[0];
    console.log(track);
    producer = await transport.produce({ track });
    console.log('localVideo');
    console.log($('#localVideo'))


    return stream;
}

async function subscribe() {
    console.log('subscribe');
    socket.emit('createConsumerTransport', {
        forceTcp: false,
    }, onConsumerTransport);

}

async function onConsumerTransport(data) {
    console.log('onConsumerTransport');

    const transport = device.createRecvTransport(data);

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        console.log('connect');
        try {
            socket.emit('connectConsumerTransport', {
                transportId: transport.id,
                dtlsParameters
            }, callback)
        }
        catch (e) {
            console.log('error');
            console.log(e)
            errback(e);
        }
    });

    transport.on('connectionstatechange', (state) => {
        console.log('connectionstatechange');
        switch (state) {
            case 'connecting':
                console.log('connecting');
                break;

            case 'connected':
                console.log('connected');
                console.log(1);
                document.getElementById('remoteVideo').srcObject = stream;
                console.log(2);
                break;

            case 'failed':
                console.log('failed');
                transport.close();
                break;

            default: break;
        }
    });

    //try {
    const stream = await consume(transport);
    //}
    //catch (err) {
    //console.log('err in consume');
    //console.log(err);
    //}
}

async function consume(transport) {
    console.log('consume');
    const { rtpCapabilities } = device;

    let data;
    try {
        data = await new Promise((resolve, reject) => {
            socket.emit('consume', { rtpCapabilities }, resolve)
        })
    }
    catch(err)
    {
        console.log('err in emit consume');
        console.log(err)
    }

    console.log(data);

    const {
        producerId,
        id,
        kind,
        rtpParameters,
    } = data;


    let codecOptions = {};
    let consumer;

    try {
        consumer = await transport.consume({
            id,
            producerId,
            kind,
            rtpParameters,
            codecOptions,
        });
    }
    catch (err) {
        console.log('err in transport consume');
        console.log(err);
        console.log(err.stack);
    }
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    return stream;
}



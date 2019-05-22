import io from 'socket.io-client';
//import * as mediasoupClient from "mediasoup-client";

const socket = io('https://139.59.155.242');

socket.on('connect', () => {
    console.log('connect')

    //const data = await socket.request('getRouterRtpCapabilities');
    // await loadDevice(data);

    socket.emit('getRouterRtpCapabilities',null, loadDevice)
    console.log('nachemit');
});

function loadDevice(data)
{
    console.log('loaddevide');
    console.log(data);
}
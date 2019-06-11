const sdpTransform = require('sdp-transform');
const sdpCommonUtils = require('mediasoup-client/lib/handlers/sdp/commonUtils');
const Logger = require('mediasoup-client/lib/Logger');
const EnhancedEventEmitter = require('mediasoup-client/lib/EnhancedEventEmitter');

const logger = new Logger('Edge');

class Handler extends EnhancedEventEmitter
{
	constructor(
		{
			iceParameters,
			iceCandidates,
			dtlsParameters,
			iceServers,
			iceTransportPolicy,
			proprietaryConstraints
		}
	)
	{
		logger.debug('Handler constructor()');
		super(logger);

		// Got transport local and remote parameters.
		// @type {Boolean}
		this._transportReady = false;

		// Remote SDP handler.
		// @type {RemoteSdp}
		this._remoteSdp = new RemoteSdp(
			{
				iceParameters,
				iceCandidates,
				dtlsParameters,
				planB : true
			});

		// RTCPeerConnection instance.
		// @type {RTCPeerConnection}
		this._pc = new RTCPeerConnection(
			{
				iceServers         : iceServers || [],
				iceTransportPolicy : iceTransportPolicy || 'all',
				bundlePolicy       : 'max-bundle',
				rtcpMuxPolicy      : 'require',
				sdpSemantics       : 'plan-b'
			},
			proprietaryConstraints);

		// Handle RTCPeerConnection connection status.
		this._pc.addEventListener('iceconnectionstatechange', () =>
		{
			switch (this._pc.iceConnectionState)
			{
				case 'checking':
					this.emit('@connectionstatechange', 'connecting');
					break;
				case 'connected':
				case 'completed':
					this.emit('@connectionstatechange', 'connected');
					break;
				case 'failed':
					this.emit('@connectionstatechange', 'failed');
					break;
				case 'disconnected':
					this.emit('@connectionstatechange', 'disconnected');
					break;
				case 'closed':
					this.emit('@connectionstatechange', 'closed');
					break;
			}
		});
	}

	close()
	{
		logger.debug('close()');
	}

	async getTransportStats()
	{
		logger.debug('getTransportStats()');
	}

	async updateIceServers({ iceServers })
	{
		logger.debug('updateIceServers()');
	}

	async _setupTransport({ localDtlsRole, localSdpObject = null })
	{
		logger.debug('_setupTransport()');
	}

}

class SendHandler extends Handler
{
	constructor(data)
	{
		logger.debug('SendHandler constructor()')
		super(data);
	}

	async send({ track, encodings, codecOptions })
	{
		logger.debug('send() [kind:%s, track.id:%s]', track.kind, track.id);
	}

	async stopSending({ localId })
	{
		logger.debug('stopSending() [localId:%s]', localId);

	}

	async replaceTrack({ localId, track }) // eslint-disable-line no-unused-vars
	{
		logger.debug('replaceTrack')
		throw new UnsupportedError('not implemented');
	}

	// eslint-disable-next-line no-unused-vars
	async setMaxSpatialLayer({ localId, spatialLayer })
	{
		logger.debug('setMaxSpatialLayer')
		throw new UnsupportedError('not supported');
	}

	async getSenderStats({ localId }) // eslint-disable-line no-unused-vars
	{
		logger.debug('getSenderStats')
		throw new UnsupportedError('not implemented');
	}

	async restartIce({ iceParameters })
	{
		logger.debug('restartIce()');
	}
}

class RecvHandler extends Handler
{
	constructor(data)
	{
		logger.debug('RecvHandler constructor()')
		super(data);

		// Map of MID, RTP parameters and RTCRtpReceiver indexed by local id.
		// Value is an Object with mid and rtpParameters.
		// @type {Map<String, Object>}
		this._mapIdRtpParameters = new Map();
	
	}

	async receive({ id, kind, rtpParameters })
	{
		logger.debug('receive() [id:%s, kind:%s]', id, kind);
	}

	async stopReceiving({ localId })
	{
		logger.debug('stopReceiving() [localId:%s]', localId);

	}

	async getReceiverStats({ localId }) // eslint-disable-line no-unused-vars
	{
		logger.debug('getReceiverStats()');
	}
	
	async restartIce({ iceParameters })
	{
		logger.debug('restartIce()');
	}
}

class Edge {
    
	static async getNativeRtpCapabilities()
	{
        console.log('getNativeRtpCapabilities()');
        const pc = new RTCPeerConnection(
			{
				iceServers         : [],
				iceTransportPolicy : 'all',
				bundlePolicy       : 'max-bundle',
				rtcpMuxPolicy      : 'require',
				sdpSemantics       : 'plan-b'
			});

		try
		{
			const offer = await pc.createOffer(
				{
					offerToReceiveAudio : true,
					offerToReceiveVideo : true
				});

			try { pc.close(); }
			catch (error) {}
            
            console.log(offer.sdp);

			const sdpObject = sdpTransform.parse(offer.sdp);
			const nativeRtpCapabilities =
				sdpCommonUtils.extractRtpCapabilities({ sdpObject });

            console.log(nativeRtpCapabilities);    

			return nativeRtpCapabilities;
		}
		catch (error)
		{
			try { pc.close(); }
			catch (error2) {}

			throw error;
		}
	}
	
	constructor(
		{
			direction,
			iceParameters,
			iceCandidates,
			dtlsParameters,
			iceServers,
			iceTransportPolicy,
			proprietaryConstraints,
			extendedRtpCapabilities
		}
	)
	{
		logger.debug('constructor() [direction:%s]', direction);

		switch (direction)
		{
			case 'send':
			{
				const sendingRtpParametersByKind =
				{
					audio : ortc.getSendingRtpParameters('audio', extendedRtpCapabilities),
					video : ortc.getSendingRtpParameters('video', extendedRtpCapabilities)
				};

				const sendingRemoteRtpParametersByKind =
				{
					audio : ortc.getSendingRemoteRtpParameters('audio', extendedRtpCapabilities),
					video : ortc.getSendingRemoteRtpParameters('video', extendedRtpCapabilities)
				};

				return new SendHandler(
					{
						iceParameters,
						iceCandidates,
						dtlsParameters,
						iceServers,
						iceTransportPolicy,
						proprietaryConstraints,
						sendingRtpParametersByKind,
						sendingRemoteRtpParametersByKind
					});
			}

			case 'recv':
			{
				return new RecvHandler(
					{
						iceParameters,
						iceCandidates,
						dtlsParameters,
						iceServers,
						iceTransportPolicy,
						proprietaryConstraints
					});
			}
		}
	}

}

module.exports = Edge;


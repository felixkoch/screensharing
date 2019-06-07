const sdpTransform = require('sdp-transform');
const sdpCommonUtils = require('mediasoup-client/lib/handlers/sdp/commonUtils');
class Edge {

    constructor()
    {
        console.log('inst');
    }
    
    test()
    {
        this.test = 'Edge'
    }

    
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

}

module.exports = Edge;


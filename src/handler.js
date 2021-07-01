const VoiceResponse = require('twilio').twiml.VoiceResponse;
const AccessToken = require('twilio').jwt.AccessToken;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const config = require('../config');
const client = require("twilio")(accountSid, authToken);

const VoiceGrant = AccessToken.VoiceGrant;
const twilioNumber = process.env.TWILIO_CALLER_ID;

const nameGenerator = require('../name_generator');

exports.tokenGenerator = function tokenGenerator() {
  const identity = nameGenerator();

  const accessToken = new AccessToken(config.accountSid,
      config.apiKey, config.apiSecret);
  accessToken.identity = identity;
  const grant = new VoiceGrant({
    outgoingApplicationSid: config.twimlAppSid,
    incomingAllow: true,
  });
  accessToken.addGrant(grant);

  // Include identity and token in a JSON response
  return {
    identity: identity,
    token: accessToken.toJwt(),
  };
};

exports.voiceResponse = function voiceResponse(toNumber) {
  console.log("dialing...")
  // Create a TwiML voice response
  const twiml = new VoiceResponse();

  if (toNumber) {
    // Wrap the phone number or client name in the appropriate TwiML verb
    // if is a valid phone number
    const attr = isAValidPhoneNumber(toNumber) ? 'number' : 'client';
    console.log({attr})
    const dial = twiml.dial({
      callerId: config.callerId,
    });
    dial[attr]({}, toNumber);
  } else {
    twiml.say('Thanks for calling!');
  }

  return twiml.toString();
};

exports.sendSMS = function sendSMS(msg, receiver) {
  client.messages
    .create({
      body: msg,
      to: receiver, // Text this number
      from: twilioNumber, // From a valid Twilio number
    })
    .then((message) => console.log(message.sid));
}

exports.callForwarder = function callFowarder(toNumber) {
  console.log("dialing...");
  client.calls
    .create({
      method: "GET",
      statusCallback: "https://www.myapp.com/events",
      statusCallbackEvent: ["initiated", "answered", "completed"],
      statusCallbackMethod: "POST",
      url: "http://demo.twilio.com/docs/voice.xml",
      record: true,
      to: toNumber,
      from: twilioNumber,
    })
    .then((call) => console.log(call.sid));
}

exports.callReceiver = function callReceiver(req, response) {
    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "hello world!");
    twiml.play({}, "https://demo.twilio.com/docs/classic.mp3");
    // req.body . {FromCity, FromState, FromCountry}
    // Render the response as XML in reply to the webhook request
    response.type("text/xml");
    response.send(twiml.toString());
}

/**
* Checks if the given value is valid as phone number
* @param {Number|String} number
* @return {Boolean}
*/
function isAValidPhoneNumber(number) {
  return /^[\d\+\-\(\) ]+$/.test(number);
}

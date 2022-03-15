const Url = require('./url.js');
const Check = require('./check.js');
const error = require('../error.js');
const StarkHost = require('./host.js');
const axios = require('axios').default;
const stark = require('../../../../index');
const Ecdsa = require('starkbank-ecdsa').Ecdsa;


class Response {

    constructor(status, content) {
        this.status = status;
        this.content = content;
    }

    json() {
        return this.content;
    }
}

function preProcess(host, sdkVersion, user, method, path, payload, query, version, language) {
    user = user || stark.user;
    language  = Check.language(stark.language);
    if(!user) {
        throw Error('A user is required to access our API. Check our docs :https://starkbank.com/docs/api#authentication');
    }

    let service = {
        [StarkHost.infra]: "starkinfra",
        [StarkHost.bank]: "starkbank",
        [StarkHost.sign]: "starksign"
    }[host]
    
    let hostname = {
        'production': 'https://api.'+ service +'.com/'+ version,
        'sandbox': 'https://sandbox.api.'+ service +'.com/'+ version,
    }[user.environment]

    let options = {
        'method': method,
    };

    let url = hostname + "/" + path + Url.encode(query);
    let acessTime = Math.round((new Date()).getTime() / 1000);
    let message = user.accessId() + ':' + acessTime + ':';
    if (payload && (method === 'POST'|| method === 'PUT' || method === 'PATCH')) {
        let body = JSON.stringify(payload);
        message += body;
        options['data'] = body;
    }

    options['headers'] = {
        'Access-Id': user.accessId(),
        'Access-Time': acessTime,
        'Access-Signature': Ecdsa.sign(message, user.privateKey()).toBase64(),
        'User-Agent': 'Node-' + process.versions['node'] + '-SDK-' + service + '-' + sdkVersion,
        'Content-Type': 'application/json',
        'Accept-Language': language
    };
    options['url'] = url

    return options
}

exports.fetch = async function(host, sdkVersion, user, method, path, payload = null, query = null, apiVersion = 'v2', language = 'en-US', timeout = 15) {
    let options = preProcess(host, sdkVersion, user, method, path, payload, query, apiVersion, language);
    let response;
    let content;
    let status;
    try {
        response = await axios(options);
        content = response.data;
        status = response.status;
    } catch (e){
        if (!e.response){
            throw e;
        }
        response = await e.response;
        content = response.data;
        status = response.status;
        switch (status) {
            case 400:
            case 404:
                throw new error.InputErrors(content, status);
            case 500:
                throw new error.InternalServerError(content, status);
            default:
                throw e;
        }
    }
    return new Response(status, content);
};

exports.authenticationHeaders = async function (user, body) {
    if (user instanceof PublicUser)
        return {};

    acessTime = Date.now().toString();
    message = user.acessId() + ':' + acessTime + ':' + body;
    signature = Ecdsa.sign(message, user.privateKey()).toBase64();

    return {
        'Access-Id': user.acessId(),
        'Acess-Time': acessTime,
        'Access-signature': signature
    }
};

exports.fetchBuffer = async function (host, sdkVersion, user, method, path, payload = null, query = null, version = 'v2', language = 'en-US', timeout = 15) {
    let options = preProcess(host, sdkVersion, user, method, path, payload, query, version, language);
    options['responseType'] = 'arraybuffer';
    options['responseEnconding'] = 'binary';
    let content;
    let status;
    try {
        response = await axios(options);
        content = await Buffer.from(response.data, 'binary');
        status = response.status;
    } catch(e) {
        if(!e.response){
            throw e;
        }
        response = await e.response;
        content = response.data;
        status = response.status;
        switch (status) {
            case 400:
            case 404:
                throw new error.InputErrors(JSON.parse(content.toString()), status);
            case 500:
                throw new error.InputErrors(content.toString(), status);
            default:
                throw e;
        }
    }
    return new Response(status, content);
};
const api = require('./api.js');
const fetch = require('./request.js').fetch;
const { fetchBuffer } = require('./request.js');

exports.getPage = async function (sdkVersion, host, apiVersion, resource, user = null, language, timeout, query = []) {
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'GET',
        `${api.endpoint(resource['name'])}`,
        null,
        query,
        apiVersion,
        language,
        timeout
    );
    let json = response.json();
    let returnEntities = json[api.lastNamePlural(resource['name'])];
    let entities = [];
    let cursor = json['cursor'];
    for (let entity of returnEntities) {
        entities.push(Object.assign(new resource['class'](entity), entity));
    }
    return [entities, cursor];
};

exports.getList = async function* (sdkVersion, host, apiVersion, resource, user = null, language, timeout, query = []) {
    let json;
    let list;
    let cursor = '';
    let names = api.lastNamePlural(resource['name']);
    let limit = query['limit'] ? query['limit'] : null;
    do {
        if (!query) {
            query = {};
        } else {
            for (let key in query) {
                if (Array.isArray(query[key])) {
                    query[key] = query[key].join();
                }
            }
        }
        Object.assign(query, {
            'limit': Math.min(100, limit),
            'cursor': cursor,
        });
        let response = await fetch(
            host,
            sdkVersion,
            user,
            'GET',
            `${api.endpoint(resource['name'])}`,
            null,
            query,
            apiVersion,
            language,
            timeout
        );
        json = response.json();
        list = json[api.lastName(names)];
        cursor = json['cursor'];
        if (limit) {
            limit -= 100;
        }
        for (let entity of list) {
            yield Object.assign(new resource['class'](entity), entity);
        }
    } while (cursor && (limit === null || limit > 0));
};

exports.getId = async function (sdkVersion, host, apiVersion, user = null, resource, id, language, timeout, query  = []) {
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'GET',
        `${api.endpoint(resource['name'])}/${id}`,
        null,
        query,
        apiVersion,
        language,
        timeout
    );
    let json = response.json();
    let returnEntity = json[api.lastName(resource['name'])];
    return Object.assign(new resource['class'](returnEntity), returnEntity);
};

exports.getContent = async function (sdkVersion, host, apiVersion, user, resource, id, subResource, language, timeout, query = []){
    let response = await fetchBuffer(
        host,
        sdkVersion,
        user,
        'GET',
        `${api.endpoint(resource['name'])}/${id}/${subResource}`,
        null,
        query,
        apiVersion,
        language,
        timeout
    );
    return response.content;
};

exports.getSubResource = async function (sdkVersion, host, apiVersion, user = null, resource, id, subResource, language, timeout) {
    let endpoint = `${api.endpoint(resource['name'])}`
    let subResourceEndpoint = `${api.endpoint(subResource['name'])}`
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'GET',
        `${endpoint}/${id}/${subResourceEndpoint}`,
        null,
        null,
        apiVersion,
        language,
        timeout
    )
    let json = response.json();
    let returnEntity = json[api.lastName(subResourceEndpoint)]
    return Object.assign(new subResource['class'].constructor(returnEntity), returnEntity);
};

exports.getPublicKey = async function (sdkVersion, host, apiVersion, user, language, timeout) {
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'GET',
        'public-key',
        null,
        {'limit': 1},
        apiVersion,
        language,
        timeout
    );
    let json = response.json();
    return json['publicKeys'][0]['content'];
};

exports.post = async function (sdkVersion, host, apiVersion, user, resource, entities, language, timeout, query) {
    let names = api.lastNamePlural(resource['name'])
    for (let entity of entities) {
        api.removeNullKeys(entity);
    }
    let payload = {};
    payload[names] = entities;
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'POST',
        `${api.endpoint(resource['name'])}`,
        payload,
        query,
        apiVersion,
        language,
        timeout
    )
    let json = response.json();
    let list = json[api.lastName(names)];
    let newList = [];
    for (let entity of list) {
        let newResource = new resource['class'](entity);
        newList.push(Object.assign(newResource, entity));
    }
    return newList;
}

exports.postMulti = async function (sdkVersion, host, apiVersion, user, resource, entities, language, timeout, query) {
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'POST',
        `${api.endpoint(resource['name'])}`,
        `${api.fromApiJson(entity, resource['name'])}`,
        apiVersion,
        language,
        timeout,
        query
    );
    let json = response.json();
    entities = json[api.lastNamePlural(resource['name'])];
    return entities.forEach(entity => {
        entities.push(api.fromApiJson(resource['maker'], entity));
    });
};

exports.postSingle = async function (sdkVersion, host, apiVersion, user, resource, language, timeout, query) {
    let payload = Object.assign(new resource['class']({}), query);
    api.removeNullKeys(payload);
    let  response = await fetch(
        host,
        sdkVersion,
        user,
        'POST',
        `${api.endpoint(resource['name'])}`,
        payload,
        query,
        apiVersion,
        language,
        timeout
    );
    let json = response.json();
    let returnEntity = json[api.lastName(resource['name'])];
    return Object.assign(new resource['class'](returnEntity), returnEntity);
};

exports.postSubResource = async function (sdkVersion, host, apiVersion, user, id, subResource, resource, payload, language, timeout) {
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'POST',
        api.endpoint(resource['name']) + "/" + id + "/" + api.endpoint(subResource['name']),
        payload,
        apiVersion,
        language,
        timeout
    )
    let json = response.json();
    let returnEntity = json[api.lastName(subResource)];
    return Object.assign(new subResource['class'](returnEntity), returnEntity);
};

exports.deleteId = async function (sdkVersion, host, apiVersion, user, resource, id, language, timeout, query) {
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'DELETE',
        `${api.endpoint(resource['name'])}/${id}`,
        null,
        null,
        query,
        apiVersion,
        language,
        timeout
    );
    let json = response.json();
    let returnEntity = json[api.lastName(resource['name'])];
    return Object.assign(new resource['class'](returnEntity), returnEntity);
};

exports.patchId = async function (sdkVersion, host, apiVersion, user, resource, id, payload, language, timeout) {
    api.removeNullKeys(payload);
    let response = await fetch(
        host,
        sdkVersion,
        user,
        'PATCH',
        `${api.endpoint(resource['name'])}/${id}`,
        payload,
        null,
        apiVersion,
        language,
        timeout
    )
    let json = response.json();
    let returnEntity = json[api.lastName(resource['name'])];
    return Object.assign(new resource['class'](returnEntity), returnEntity);
};

exports.getRaw = async function (sdkVersion, host, apiVersion, path, user, language, timeout, query) {
    let response = await fetch(
        host,
        sdkVersion,
        user,
        "GET",
        path,
        query,
        apiVersion,
        language,
        timeout
    );
    let json = response.json();
    return json;
};

exports.postRaw = async function (sdkVersion, host, apiVersion, resource, payload, user, language, timeout, query) {
    let response =  await fetch(
        host,
        sdkVersion,
        user,
        "POST",
        resource,
        payload,
        query,
        apiVersion,
        language,
        timeout
    );
    let json = response.json();
    return json;
};

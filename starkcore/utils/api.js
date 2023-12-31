const SubResource = require('./subResource').SubResource
const utf8 = require('utf8');


function decamelize(str, separator='-') {
    return str
        .replace(/([a-z\d])([A-Z])/g, '$1' + separator + '$2')
        .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1' + separator + '$2')
        .toLowerCase();
};

exports.fromApiJson = function(resource, json){
    json['checkParams'] = false;
    return resource(json);
};

exports.castJsonToApiFormat = function (json, resourceName) {
    clean = [];
    if (json === null) {
        return clean;
    }
    for(const key in json) {
        const value = json[key];
        if (value === null) {
            continue;
        }
        if (typeof value === 'string') {
            value = utf8.encode(value);
            clean[key] = utf8.encode(value);
            continue;
        }
        if (value instanceof Date) {
            clean[key] = api.convertDateInterval(value);
            continue;
        }
        if (Array.isArray(value)) {
            clean[key] = api.castJsonToApiFormat(value, resourceName)
        }
        clean[key] = value;
        
        return clean;
    }
}; 

exports.endpoint = function (resource, keepDash = false) {
    let decamelized = decamelize(resource);
    if (keepDash) {
        return decamelized;
    }
    return decamelized.replace('-log', '/log')
                      .replace('-attempt', '/attempt');
};

exports.lastName = function (resource) {
    let splitString = decamelize(resource).split('-');
    return splitString[splitString.length - 1];
};

exports.lastNamePlural = function (resource) {
    lastName = exports.lastName(resource);
    if (lastName.endsWith('s')) {
        return lastName;
    }
    if (lastName.endsWith('y') && !lastName.endsWith('ey')) {
        return `${lastName.slice(0, -1)}ies`;
    }
    return `${lastName}s`;
};

exports.removeNullKeys = function (dict) {
    Object.entries(dict).forEach(([key, value]) => {
         if (value === undefined || value === null)
             delete dict[key];
         else if (value.constructor == Object || value instanceof SubResource || value instanceof Array)
             exports.removeNullKeys(value);
    });
};

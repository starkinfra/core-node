const assert = require('assert');
const axios = require('axios').default;
const PrivateKey = require('starkbank-ecdsa').PrivateKey;
const stark = require('../index.js');
const host = require('../starkcore/utils/host');
const rest = require('../starkcore/utils/rest.js');
const Resource = require('../starkcore/utils/resource.js').Resource;


class Note extends Resource {
    constructor({ id = null, text = null, tag = null }) {
        super(id);
        this.text = text;
        this.tag = tag;
    }
}

const resource = { 'class': Note, 'name': 'Note' };
const user = new stark.Project({
    environment: 'sandbox',
    id: '5656565656565656',
    privateKey: new PrivateKey().toPem()
});

describe('TestPostSingle', function () {
    let requests;
    let original;

    beforeEach(() => {
        requests = [];
        original = axios.defaults.adapter;
        axios.defaults.adapter = async (config) => {
            requests.push(config);
            return { data: { note: { id: '5656565656565656', text: 'answer' } }, status: 200, statusText: 'OK', headers: {}, config: config };
        };
    });

    afterEach(() => {
        axios.defaults.adapter = original;
    });

    async function post(entity) {
        return rest.postSingle(stark.version, host.infra, 'v2', user, resource, 'en-US', 15, entity);
    }

    it('test_sends_the_entity_only_in_the_body', async () => {
        await post({ text: 'hello' });
        assert.strictEqual(requests[0].method.toUpperCase(), 'POST');
        assert.strictEqual(requests[0].url, 'https://sandbox.api.starkinfra.com/v2/note');
        assert.deepStrictEqual(JSON.parse(requests[0].data), { text: 'hello' });
    });

    it('test_a_large_field_does_not_reach_the_url', async () => {
        await post({ text: 'x'.repeat(20000) });
        assert(requests[0].url.length < 100, requests[0].url.length);
        assert.strictEqual(JSON.parse(requests[0].data).text.length, 20000);
    });

    it('test_drops_the_null_keys_of_the_body', async () => {
        await post({ text: 'a', tag: null });
        assert.deepStrictEqual(JSON.parse(requests[0].data), { text: 'a' });
    });

    it('test_returns_the_entity_under_the_resource_key', async () => {
        const note = await post({ text: 'hello' });
        assert(note instanceof Note);
        assert.strictEqual(note.id, '5656565656565656');
        assert.strictEqual(note.text, 'answer');
    });
});

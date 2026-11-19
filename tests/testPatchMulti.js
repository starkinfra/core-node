const assert = require('assert');
const axios = require('axios').default;
const PrivateKey = require('starkbank-ecdsa').PrivateKey;
const stark = require('../index.js');
const host = require('../starkcore/utils/host');
const rest = require('../starkcore/utils/rest.js');
const Resource = require('../starkcore/utils/resource.js').Resource;


class Card extends Resource {
    constructor({ id = null, holderName = null, holderTaxId = null, holderExternalId = null, tags = null }) {
        super(id);
        this.holderName = holderName;
        this.holderTaxId = holderTaxId;
        this.holderExternalId = holderExternalId;
        this.tags = tags;
    }
}

const resource = { 'class': Card, 'name': 'Card' };
const user = new stark.Project({
    environment: 'sandbox',
    id: '5656565656565656',
    privateKey: new PrivateKey().toPem()
});

// Only the outgoing HTTP call (the axios adapter) is replaced: signing, headers and payload building run for real.
describe('TestPatchMulti', function () {
    let requests;
    let original;
    let reply;

    beforeEach(() => {
        requests = [];
        reply = { status: 200, data: { cards: [{ id: '1' }] } };
        original = axios.defaults.adapter;
        axios.defaults.adapter = async (config) => {
            requests.push(config);
            let response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config: config };
            if (reply.status >= 400) {
                let error = new Error('Request failed');
                error.response = response;
                throw error;
            }
            return response;
        };
    });

    afterEach(() => {
        axios.defaults.adapter = original;
    });

    async function patch(entities, query) {
        return rest.patchMulti(stark.version, host.infra, 'v2', user, resource, entities, 'en-US', 15, query);
    }

    it('test_success_sends_patch_with_plural_payload_and_parses_response', async () => {
        reply.data = { cards: [
            { id: '1', holderName: 'Tony Stark', holderTaxId: '012.345.678-90', holderExternalId: 'a', tags: [] },
            { id: '2', holderName: 'Tony Stark', holderTaxId: '012.345.678-90', holderExternalId: 'a', tags: [] },
        ] };
        let cards = await patch([
            { id: '1', holderName: 'Tony Stark', holderTaxId: '012.345.678-90', holderExternalId: 'a' },
            { id: '2', holderName: 'Tony Stark', holderTaxId: '012.345.678-90', holderExternalId: 'a' },
        ]);
        assert.strictEqual(requests.length, 1);
        assert.strictEqual(requests[0].method.toUpperCase(), 'PATCH');
        assert.strictEqual(requests[0].url, 'https://sandbox.api.starkinfra.com/v2/card');
        let headerNames = Object.keys(requests[0].headers).map(name => name.toLowerCase());
        assert.ok(headerNames.includes('access-signature'));
        assert.deepStrictEqual(JSON.parse(requests[0].data), { cards: [
            { id: '1', holderName: 'Tony Stark', holderTaxId: '012.345.678-90', holderExternalId: 'a' },
            { id: '2', holderName: 'Tony Stark', holderTaxId: '012.345.678-90', holderExternalId: 'a' },
        ] });
        assert.deepStrictEqual(cards.map(card => card.id), ['1', '2']);
        assert.ok(cards.every(card => card instanceof Card));
        assert.strictEqual(cards[0].holderName, 'Tony Stark');
    });

    it('test_unset_attributes_are_not_sent', async () => {
        await patch([{ id: '1', tags: ['x'], holderName: null }]);
        assert.deepStrictEqual(JSON.parse(requests[0].data), { cards: [{ id: '1', tags: ['x'] }] });
    });

    it('test_query_parameters_are_sent_in_the_url', async () => {
        await patch([{ id: '1' }], { expand: ['rules'] });
        assert.ok(requests[0].url.endsWith('/v2/card?expand=rules'), requests[0].url);
    });

    it('test_api_error_is_raised_untouched', async () => {
        reply = { status: 400, data: { errors: [{ code: 'invalidHolder', message: 'Element 0: must all be provided together, or none at all.' }] } };
        await assert.rejects(
            () => patch([{ id: '1', holderName: 'Tony Stark' }]),
            (error) => {
                assert.deepStrictEqual(error.errors.map(e => e.errorCode || e.code), ['invalidHolder']);
                return true;
            }
        );
    });
});

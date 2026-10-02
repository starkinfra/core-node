const assert = require('assert');
const api = require('../starkcore/utils/api.js');


describe('TestApiLastNamePlural', function() {
    const unchanged = {
        Transaction: 'transactions',
        BoletoPayment: 'payments',
        PixDomain: 'domains',
        DictKey: 'keys',
        Category: 'categories',
        CreditHolmes: 'holmes',
        Address: 'address'
    };

    for (let [resource, plural] of Object.entries(unchanged)) {
        it(`test_keeps_${resource}`, () => {
            assert.strictEqual(api.lastNamePlural(resource), plural);
        });
    }

    const withEs = {
        AiSpeech: 'speeches',
        Branch: 'branches',
        Swish: 'swishes',
        TaxBox: 'boxes'
    };

    for (let [resource, plural] of Object.entries(withEs)) {
        it(`test_adds_es_to_${resource}`, () => {
            assert.strictEqual(api.lastNamePlural(resource), plural);
        });
    }
});

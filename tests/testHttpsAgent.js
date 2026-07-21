const assert = require('assert');
const https = require('https');
const stark = require('../index.js');
const user = require('./utils/user.js');
const host = require('../starkcore/utils/host');
const rest = require('../starkcore/utils/rest.js');
const Resource = require('../starkcore/utils/resource.js').Resource;

stark.user = require('./utils/user.js').exampleProject;

class Transaction extends Resource {
    constructor({ id, amount }) {
        super(id);
        this.amount = amount;
    }
}

describe('testHttpsAgent', function () {
    this.timeout(10000);
    it('test_success', async () => {
        const agent = new https.Agent({ keepAlive: true });
        stark.setHttpsAgent(agent);

        let transactions = await rest.getPage(
            '2.13.0',
            host.bank,
            'v2',
            resource = {'class': Transaction, 'name': 'Transaction'},
            user.exampleProject,
            'pt-BR',
            2000,
            { "before": "2022-02-01", "limit": 1 }
        );
        for await (let transaction of transactions[0]) {
            assert(typeof transaction.id == 'string');
        }

        assert.strictEqual(stark.getHttpsAgent(), agent);
    });
});

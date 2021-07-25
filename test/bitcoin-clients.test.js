const assert = require("assert");
const { fail } = require("yargs");
const {get_block, get_tx_heigth, build_clients_object} = require("./../src/bitcoin-clients.js");

describe("testing btc client host parsing", ()=>{

    it("Should fail", (done)=>{
        try {
            build_clients_object("user:pwd:aedaed", "test", "test");
            assert.fail("This parsing shouldn't work");
        } catch(err) {
            done();
        }
    });

    it("Should work with two clients", (done)=>{
        try {
            let resp = build_clients_object("127.0.0.1:8332,127.0.0.2:8888", "mylog", "mypass");
            assert.deepStrictEqual(resp, {
                hosts: [
                    "127.0.0.1",
                    "127.0.0.2"
                ],
                ports: [
                    "8332",
                    "8888"
                ],
                login: "mylog",
                password: "mypass",
                last_used_id: 0
            });
            done();
        } catch(err) {
            assert.fail("An error happened:"+err);
        }
    });


    it("Should work with one client", (done)=>{
        try {
            let resp = build_clients_object("127.0.0.1", "mylog", "mypass");
            assert.deepStrictEqual(resp, {
                hosts: [
                    "127.0.0.1"
                ],
                ports: [
                    "8332"
                ],
                login: "mylog",
                password: "mypass",
                last_used_id: 0
            });
            done();
        } catch(err) {
            assert.fail("An error happened:"+err);
        }
    });
});
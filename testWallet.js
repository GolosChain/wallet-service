const jayson = require('jayson');

const cliWalletPassword = "1";

const client = jayson.client.http({

  port: 3000

});

const getRandomArbitrary = (minRandValue, maxRandValue) => {

  return Math.random() * (maxRandValue - minRandValue) + minRandValue;

}

const genRequestId = () => {

  const minIdValue = 1;

  const maxIdValue = 1000000;

  return getRandomArbitrary(minIdValue, maxIdValue);
}

class WalletTester {

  unlock() {

    let params = [cliWalletPassword];

    let id = genRequestId();

    client.request('unlock', params, id, function (err, response) {

      if (err) {

        throw err;

      }

      console.log(response);

    });

  }

  info() {

    let params = [];

    let id = genRequestId();

    let res = {};

    client.request('info', params, id, function (err, response) {

      if (err) {

        throw err;

      }

      console.log(response);

    });

    return res;

  }

  // transfer(string from, string to, asset amount, string memo, bool broadcast)
  transfer(from, to, amount, memo, broadcast) {

    let params = [from, to, amount, memo, broadcast];

    let id = genRequestId();

    client.request('transfer', params, id, function (err, response) {

      if (err) {

        throw err;

      }

      console.log(response);

    });

  }

  listMyAccounts() {

  }

};


let w = new WalletTester();

w.unlock();

w.info();

const jayson = require('jayson');

const cliWalletPassword = "1";

const client = jayson.client.http({
  host: '0.0.0.0',
  port: 8091

});

// const client = jayson.client.http({
//   host: '127.0.0.1',
//   port: 3000

// });

const getRandomArbitrary = (minRandValue, maxRandValue) => {

  return (Math.random() * (maxRandValue - minRandValue) + minRandValue) | 0;

}

const genRequestId = () => {

  const minIdValue = 1;

  const maxIdValue = 1000000;

  return getRandomArbitrary(minIdValue, maxIdValue);
}

class WalletTester {

  unlock() {

    // let params = {password: cliWalletPassword};
    let params = [ cliWalletPassword];

    let id = genRequestId();

    client.request('unlock', params, id, function (err, response) {

      if (err) {

        throw err;

      }

      console.log(response);

    });

  }

  lock() {

    let params = [];

    let id = genRequestId();

    client.request('lock', params, id, function (err, response) {

      if (err) {

        throw err;

      }

      console.log(response);

    });

  }

  setPassword() {

    // let params = { password: cliWalletPassword };
    let params = [cliWalletPassword];

    let id = genRequestId();

    client.request('set_password', params, id, function (err, response) {

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

  isLocked() {

    let params = [];

    let id = genRequestId();

    let res = {};

    client.request('is_locked', params, id, function (err, response) {

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


  importKey(key) {

    // let params = {key};
    // let params = [key];
    let params = [key];

    let id = genRequestId();

    client.request('import_key', params, id, function (err, response) {

      if (err) {

        throw err;

      }

      console.log(response);

    });

  }

  listMyAccounts() {

  }

};

const accountName = 'joseph.kalu';
const privateKey = '5JiBoYuME7P3zqCATtvyhzW51rbd9yPDtvxgVfmRsyhEUWmMGCs';
let key2 = '5Jn9TkccBkeMUqWLkaQJVz71Tfefo2EMFpxaRjnjqMETBmzZ2sh';


let w = new WalletTester();

w.setPassword();
w.unlock();
w.importKey(privateKey);
w.isLocked();
w.lock();
w.unlock();
w.importKey(key2);
w.lock();
w.unlock();

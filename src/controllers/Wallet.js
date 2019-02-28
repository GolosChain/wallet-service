const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const ecc = require('eosjs-ecc');
const base58check = require('base58check');
const crypto = require('crypto');
const fs = require('fs');


const walletPath = __dirname + '/../../wallet.json';


class Wallet extends BasicController {
    constructor(...args) {
        super(...args);

        this._checksum = '';
        this._keys = {};
        this._locked = true;
        this._isNew = true;
        this._needFileUpdate = false;


        this._aesAlgorithm = 'aes-256-cbc';
        this._aesKey = Buffer.alloc(32)
        this._iv = Buffer.alloc(16);

        this._cipherKeys = '';
        this._wsServer = '0.0.0.0:8091'
        this._walletFileObject = {};
        this._walletInit(); // HAVE TO wait it
    }

    async _walletInit() {
        this._walletFileObject = await this._readWalletFile(walletPath);
        this._isNew = this._walletFileObject.cipher_keys.length === 0
    }

    async lock() {
        try {
            Logger.log('locking')
            if (this._checksum === '') {
                throw { code: 801, message: 'set_password first' };
            }

            if (this._locked) {
                return 'locked';
            }

            Logger.log('encrypting')
            this._encryptKeys();
            this._keys = {}
            this._checksum = crypto.createHash('sha512').update('').digest('hex');
            this._aesKey = Buffer.from(this._checksum.substr(0, 32));

            Logger.log('Updating wallet.json file');
            this._updateWalletFile();
            this._locked = true;
            return 'locked';
        }
        catch (err) {
            Logger.warn(err.message);
            return err;
        }

    }

    async unlock(password) {
        try {
            if (password.length !== 1) {
                Logger.warn('unlock: wrong arguments');
                throw { code: 805, message: 'wrong arguments' }
            }

            password = password[0];
            Logger.log('trying unlock the wallet');

            if (this._isNew) {
                Logger.warn('unlock: set_password first');
                throw { code: 801, message: 'set_password first' }
            }

            if (!(this._locked)) {
                return 'unlocked'
            }

            if (password.length === 0) {
                Logger.warn('unlock: invalid password');
                throw { code: 804, message: 'Invalid password' }
            }

            Logger.log('Decrypting');

            let pw = crypto.createHash('sha512').update(password).digest('hex');
            let decryptedWalletObject = await this._aesDecrypt({ text: this._cipherKeys, aesKey: Buffer.from(pw.substr(0, 32)) });
            decryptedWalletObject = JSON.parse(Buffer.from(decryptedWalletObject, 'hex').toString());

            this._keys = decryptedWalletObject.keys;
            if (pw !== decryptedWalletObject.checksum) {
                Logger.warn('unlock :trouble')
                throw { code: 404, message: 'wtf' }
            }
            this._checksum = decryptedWalletObject.checksum;
            this._locked = false;

            Logger.log('Wallet was successfully unlocked ');
            return { status: 'unlocked', locked: this._locked }
        }
        catch (err) {
            Logger.warn(err.message);
            return err;
        }
    }

    // async setPassword({ password }) {
    async setPassword(password) {
        try {
            if (password.length !== 1) {
                Logger.warn('unlock: wrong arguments');
                throw { code: 805, message: 'wrong arguments' }
            }

            password = password[0];

            if (!this._isNew && this._locked) {
                Logger.warn('Wallet must be unlocked');
                throw { code: 803, message: 'Wallet must be unlocked' };
            }

            if (password.length === 0) {
                Logger.warn('Invalid password');
                throw { code: 804, message: 'invalid password' };
            }

            Logger.log('Changing checksum')
            this._checksum = crypto.createHash('sha512').update(password).digest('hex');
            this._aesKey = Buffer.from(this._checksum.substr(0, 32));

            await this._encryptKeys();

            await this._updateWalletFile();

            this._locked = true;
            this._isNew = false;

            return 'set_password'
        }
        catch (err) {
            Logger.warn(err.message);
            return err;
        }
    }

    async importKey(key) {
        try {
            if (key.length !== 1) {
                Logger.warn('unlock: wrong arguments');
                throw { code: 805, message: 'wrong arguments' }
            }

            key = key[0];

            if (this._isNew) {
                Logger.warn('unlock: set_password first');
                throw { code: 801, message: 'set_password first' }
            }

            if (this._locked) {
                Logger.warn('Wallet must be unlocked');
                throw { code: 803, message: 'Wallet must be unlocked' };
            }

            if (ecc.PrivateKey.isValid(key)) {
                let pub = ecc.PrivateKey(key).toPublic().toString()
                let keyMap = {};
                keyMap[pub] = key;

                this._keys = keyMap;
                this._encryptKeys();
                this._updateWalletFile();
                Logger.log('import_key: private key has been changed');


                return 'private key has been changed';
            }
            else {
                Logger.warn('import_key: invalid key');
                throw { code: 888, message: 'Invalid Key' };
            }
        }
        catch (err) {
            Logger.warn(err.message);
            return err;
        }
    }

    async isLocked() {
        return { isLocked: this._locked };
    }

    async _encryptKeys() {

        let walletObj = {
            keys: this._keys,
            checksum: this._checksum
        }

        let packedObj = Buffer.from(JSON.stringify(walletObj)).toString('hex');

        let aesKey = Buffer.from(this._checksum.substr(0, 32));
        this._cipherKeys = await this._aesEncrypt({ text: packedObj, aesKey });

    }

    async _updateWalletFile(path = walletPath) {
        this._saveWalletFile(path, JSON.stringify({
            cipher_keys: this._cipherKeys,
            ws_server: this._wsServer
        }));
    }

    async _saveWalletFile(path, text) {
        await fs.writeFileSync(path, text, { encoding: 'utf8', flag: 'w' });

        Logger.log("Wallet.json was updated")
    }

    async _readWalletFile(path) {
        let text = '';
        let defaultWalletObject = {
            cipher_keys: '',
            ws_server: this._wsServer
        }

        try {
            text = fs.readFileSync(path).toString();
        }
        catch (err) {
            Logger.warn('Unable to read wallet.json.')

            if (err.code === 'ENOENT') {
                this._saveWalletFile(walletPath, JSON.stringify(defaultWalletObject));
                Logger.info('created new wallet.json file')
            }
            else {
                Logger.error(err.message);
            }
        }

        if (text.length === 0) {
            return defaultWalletObject;
        }

        try {
            let obj = await JSON.parse(text);
            return obj;
        }
        catch (err) {
            return defaultWalletObject
        }
    }

    async _aesEncrypt({ text, aesKey }) {
        aesKey = (typeof aesKey === 'undefined') ? this._aesKey : aesKey;

        let cipher = crypto.createCipheriv(this._aesAlgorithm, aesKey, this._iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return encrypted.toString('hex');
    }

    async _aesDecrypt({ text, aesKey }) {
        // DEBUG
        Logger.log('start aes decrypting');
        aesKey = (typeof aesKey === 'undefined') ? this._aesKey : aesKey;

        let encryptedText = Buffer.from(text, 'hex');
        let decipher = crypto.createDecipheriv(this._aesAlgorithm, aesKey, this._iv);
        let decrypted = decipher.update(encryptedText);

        decrypted = Buffer.concat([decrypted, decipher.final()]);

        // DEBUG
        Logger.log('ending aes decrypting');
        return decrypted.toString();
    }

    async _privateKeyToWif(privateKey) {
        return base58check.encode(privateKey, version = '80', encoding = 'hex');
    }

    async _wifToPrivateKey(wif) {
        let { prefix, data } = base58check.decode(wif);

        let prefixStr = prefix.toString('hex')
        let dataStr = data.toString('hex')


        // EOS always has 80 prefix, just like in BTC
        // This byte represents the Bitcoin mainnet. EOS uses the same version byte. 
        assert.equal(prefixStr, '80');

        return { prefix: prefixStr, data: dataStr };
    }
}

module.exports = Wallet;
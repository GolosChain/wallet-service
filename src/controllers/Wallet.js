const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const ecc = require('eosjs-ecc');
const base58check = require('base58check');
const crypto = require('crypto');
const fs = require('fs');

const path = require('path');
const walletPath = path.join(__dirname, '/../../wallet.json');


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


        this._walletFileObject = this._readWalletFile(walletPath);
        this._isNew = this._walletFileObject.cipher_keys.length === 0
    }

    async lock() {
        try {
            Logger.info('lock: starting locking');
            if (!this._checksum) {
                throw { code: 801, message: 'Set password first' };
            }

            if (this._locked) {
                Logger.info('lock: already locked');
                return null;
            }

            Logger.info('lock: encrypting')
            this._encryptKeys();
            this._keys = {}
            // Checksum of empty string is needed to show, that the password hasn't been set yet.
            // This is needed in _encryptKeys()
            this._checksum = crypto.createHash('sha512').update('').digest('hex');
            this._aesKey = Buffer.from(this._checksum.substr(0, 32));

            Logger.info('lock: updating wallet.json file');
            this._updateWalletFile();
            this._locked = true;
            Logger.info('lock: locked');
            return null;
        } catch (err) {
            Logger.error(err.message);
        }

    }

    async unlock(passwords) {
        try {
            Logger.info('unlock: unlocking');

            if (passwords.length !== 1 && Array.isArray(passwords)) {
                Logger.warn('unlock: wrong arguments');
                throw { code: 805, message: 'Wrong arguments' }
            }

            const password = passwords[0];
            Logger.info('unlock: checking');

            if (this._isNew) {
                Logger.warn('unlock: Set password first');
                throw { code: 801, message: 'Set password first' }
            }

            if (!this._locked) {
                return null;
            }

            if (password.length === 0) {
                Logger.warn('unlock: invalid password');
                throw { code: 804, message: 'Invalid password' }
            }

            Logger.info('unlock: decrypting');

            const pw = crypto.createHash('sha512').update(password).digest('hex');
            let decryptedWalletObject = await this._aesDecrypt({ text: this._cipherKeys, aesKey: Buffer.from(pw.substr(0, 32)) });
            decryptedWalletObject = JSON.parse(Buffer.from(decryptedWalletObject, 'hex').toString());

            this._keys = decryptedWalletObject.keys;
            if (pw !== decryptedWalletObject.checksum) {
                Logger.warn('unlock: invalid password');
                throw { code: 804, message: 'Invalid password' }
            }
            this._checksum = decryptedWalletObject.checksum;
            this._locked = false;

            Logger.info('unlock: unlocked');

            return null;
        } catch (err) {
            Logger.warn(err.message);
        }
    }

    async setPassword(passwords) {
        try {

            Logger.info('set_password: checking password');

            if (passwords.length !== 1 && Array.isArray(passwords)) {
                Logger.warn('unlock: wrong arguments');
                throw { code: 805, message: 'Wrong arguments' }
            }

            const password = passwords[0];

            if (!this._isNew && this._locked) {
                Logger.warn('Wallet must be unlocked');
                throw { code: 803, message: 'Wallet must be unlocked' };
            }

            if (password.length === 0) {
                Logger.warn('Invalid password');
                throw { code: 804, message: 'Invalid password' };
            }

            Logger.info('set_password: changing checksum')
            this._checksum = crypto.createHash('sha512')
                .update(password)
                .digest('hex');
            this._aesKey = Buffer.from(this._checksum.substr(0, 32));

            Logger.info('set_password: encrypting keys')
            await this._encryptKeys();

            Logger.info('set_password: saving changes to wallet.json')
            await this._updateWalletFile();

            this._locked = true;
            this._isNew = false;

            Logger.info('set_password: set_password');
            return null;
        } catch (err) {
            Logger.warn(err.message);
        }
    }

    async importKey(keys) {
        try {

            Logger.info('import_key: checking key');

            if (keys.length !== 1 && Array.isArray(keys)) {
                Logger.warn('import_key: wrong arguments');
                throw { code: 805, message: 'Wrong arguments' }
            }

            const key = keys[0];

            if (this._isNew) {
                Logger.warn('import_key: set password first');
                throw { code: 801, message: 'Set password first' }
            }

            if (this._locked) {
                Logger.warn('import_key: wallet must be unlocked');
                throw { code: 803, message: 'Wallet must be unlocked' };
            }

            if (ecc.PrivateKey.isValid(key)) {
                Logger.info('import_key: valid private key. adding');

                const pub = ecc.PrivateKey(key).toPublic().toString()
                const keyMap = {};
                keyMap[pub] = key;

                this._keys = keyMap;
                this._encryptKeys();
                this._updateWalletFile();
                Logger.info('import_key: private key has been changed');

                return true;
            } else {
                Logger.warn('import_key: invalid key');
                // Just like cli_wallet.
                return false;
            }
        } catch (err) {
            Logger.warn(err.message);
        }
    }

    async isLocked() {
        Logger.info('is_locked: checking');
        return this._locked;
    }

    async _encryptKeys() {
        Logger.info('encrypt_keys: packing wallet data');

        let walletObj = {
            keys: this._keys,
            checksum: this._checksum
        }

        let packedObj = Buffer.from(JSON.stringify(walletObj)).toString('hex');

        Logger.info('encrypt_keys: encrypting');

        let aesKey = Buffer.from(this._checksum.substr(0, 32));
        this._cipherKeys = await this._aesEncrypt({ text: packedObj, aesKey });

        Logger.info('encrypt_keys: encrypted');
    }

    async _updateWalletFile(path = walletPath) {
        Logger.info('update_wallet_file: saving new up to date json object');

        this._saveWalletFile(path, JSON.stringify({
            cipher_keys: this._cipherKeys,
            ws_server: this._wsServer
        }));

        Logger.info('update_wallet_file: done');
    }

    async _saveWalletFile(path, text) {
        await fs.writeFileSync(path, text, { encoding: 'utf8', flag: 'w' });

        Logger.info('save_wallet_file: wallet.json was saved');
    }

    _readWalletFile(path) {

        Logger.info('read_wallet_file: reading wallet.json');

        let text = '';
        let defaultWalletObject = {
            cipher_keys: '',
            ws_server: this._wsServer
        }

        try {
            text = fs.readFileSync(path).toString();
        } catch (err) {
            Logger.warn('read_wallet_file: unable to read wallet.json.')

            if (err.code === 'ENOENT') {
                this._saveWalletFile(walletPath, JSON.stringify(defaultWalletObject));
                Logger.info('read_wallet_file: created new wallet.json file')
            } else {
                Logger.error(err.message);
            }
        }

        if (text.length === 0) {
            return defaultWalletObject;
        }

        try {
            const obj = JSON.parse(text);
            Logger.info('read_wallet_file: successfully read new wallet.json file')
            return obj;
        } catch (err) {
            Logger.info('read_wallet_file: errors ocured')
            Logger.info('read_wallet_file: used default wallet.json file')
            return defaultWalletObject
        }
    }

    async _aesEncrypt({ text, aesKey }) {
        Logger.info('aes_encrypt: encrypting')
        aesKey = (typeof aesKey === 'undefined') ? this._aesKey : aesKey;

        let cipher = crypto.createCipheriv(this._aesAlgorithm, aesKey, this._iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        Logger.info('aes_encrypt: done')
        return encrypted.toString('hex');
    }

    async _aesDecrypt({ text, aesKey }) {
        Logger.info('aes_decrypt: decrypting')

        aesKey = aesKey || this._aesKey;

        let encryptedText = Buffer.from(text, 'hex');
        let decipher = crypto.createDecipheriv(this._aesAlgorithm, aesKey, this._iv);
        let decrypted = decipher.update(encryptedText);

        decrypted = Buffer.concat([decrypted, decipher.final()]);

        Logger.log('aes_decrypt: successfully decrypted');
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

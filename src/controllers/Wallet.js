const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const ecc = require('eosjs-ecc');


class Wallet extends BasicController {
    constructor(...args) {
        super(...args);

        this._checksum = '';
        this._keys = {};
        this._locked = true;


        this._aesAlgorithm = 'aes-256-cbc';
        this._aesKey = Buffer.alloc(32)
        this._iv = Buffer.alloc(16);

        this._cipherKeys = '';
        this._wsServer = '0.0.0.0:8091'
    }

    async lock() {
        assert(this.isLocked() === false);

        this.encryptKeys();
        this._keys = {}
        this._checksum = crypto.createHash('sha512').update('').digest('hex')


        this.updateWalletFile();

        this._locked = true;
    }

    async unlock({ masterPassword }) {
        try {

            assert(masterPassword.length > 0);

            let pw = this._checksum = crypto.createHash('sha512').update(masterPassword).digest('hex');

            if (this._cipherKeys.length === 0) {
                let walletFile = readFileSync();
                this._cipherKeys = walletFile.cipher_keys;
            }

            let decryptedWalletObject = this.aesDecrypt(pw);

            this._keys = decryptedWalletObject.keys;
            this._checksum = decryptedWalletObject.checksum;

        }
        catch (err) {
            console.log('Wrong password!')
        }
    }

    async setPassword({ masterPassword }) {
        this._checksum = crypto.createHash('sha512').update(masterPassword).digest('hex');

        this._aesKey = Buffer.from(this._checksum.substr(0, 32));

        this.encryptKeys();

        this.lock();
    }

    async importKey({ key }) {
        if (ecc.PrivateKey.isValid(key)) {
            let pub = ecc.PrivateKey(key).toPublic().toString()
            let keyMap = {};
            keyMap[pub] = key;
            this._keys = keyMap;

            console.log('>>> private key has been changed');

            this.updateWalletFile();
        }
    }

    async isLocked() {
        return this._locked;
    }


    async encryptKeys() {

        let walletObj = {
            keys: this._keys,
            checksum: this._checksum
        }

        let packedObj = Buffer.from(JSON.stringify(walletObj)).toString('hex');

        this._cipherKeys = this.aesEncrypt(packedObj);

    }


    async updateWalletFile() {

        this.encryptKeys();

        this.saveWalletFile(JSON.stringify({
            cipher_keys: this._cipherKeys,
            ws_server: this._wsServer
        }));

    }

    async saveWalletFile(text) {

        fs.writeFileSync('./wallet.json', text);

    }

    async readWalletFile() {

        return fs.readFileSync('./wallet.json');

    }

    async aesEncrypt(text) {
        // let cipher = crypto.createCipheriv(this._aesAlgorithm, Buffer.from(this._aesKey), this.iv);
        let cipher = crypto.createCipheriv(this._aesAlgorithm, this._aesKey, this._iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return encrypted.toString('hex');
    }

    async aesDecrypt(text) {
        // let iv = Buffer.from(this._iv, 'hex');
        let encryptedText = Buffer.from(text, 'hex');
        // let decipher = crypto.createDecipheriv(this._aesAlgorithm, Buffer.from(this._aesKey), iv);
        let decipher = crypto.createDecipheriv(this._aesAlgorithm, this._aesKey, this._iv);
        let decrypted = decipher.update(encryptedText);

        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    }

    async privateKeyToWif(privateKey) {
        return base58check.encode(privateKey, version = '80', encoding = 'hex');
    }

    async wifToPrivateKey(wif) {
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
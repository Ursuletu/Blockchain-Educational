import * as crypto from 'crypto'; // Module in node that handles functionality from cryptography

/* Fundamental purpose of any crypocurrency: transfer funds from one user to another user in a transaction */
/* Transaction object has three properties: amount of the transactions denominated in the coin, the payer, and the payee */
class Transaction {
  constructor(
    public amount: number,
    public payer: string, // public key
    public payee: string // public key
  ) {}

  toString() {
    return JSON.stringify(this);
  }
}

/* Generally a container for multiple transactions. In this case, just a single transaction to keep things simple. */
/* A hashing functions allows you to take a value of an arbitrary size and map it to a value of fixed length - like a hexadecimal string. The value returned from a hashing function is called a hash or a hash digest. When creating a hash, it cannot be reversed to reconstruct the original value. But two values can be validated to be identical by comparing their hashes. */
class Block {

  public nonce = Math.round(Math.random() * 999999999);

  constructor(
    public prevHash: string | null,
    public transaction: Transaction,
    // Time stamp
    public ts = Date.now() 
  ) {}

  get hash() {
    const str = JSON.stringify(this);
    const hash = crypto.createHash('SHA256'); // One way cryptographic function
    hash.update(str).end();
    return hash.digest('hex');
  }
}

/* Like a linked list of blocks. Only one block chain must exist, therefore we must use the singleton pattern. */
class Chain {
  public static instance = new Chain();

  chain: Block[];

  constructor() {
    // First transaction transfers 100 coins to satoshi. I am the money printer now, FED.
    this.chain = [new Block(null, new Transaction(100, 'genesis', 'satoshi'))];
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  mine(nonce: number) {
    let solution = 1;
    console.log('Mininng...')

    while(true) {

      const hash = crypto.createHash('MD5');
      hash.update((nonce + solution).toString()).end();

      const attempt = hash.digest('hex');

      if(attempt.substr(0,4) === '0000'){
        console.log(`Solved: ${solution}`);
        return solution;
      }

      solution += 1;
    }
  }

  addBlock(transaction: Transaction, senderPublicKey: string, signature: Buffer){
    const verifier = crypto.createVerify('SHA256');
    verifier.update(transaction.toString());

    const isValid = verifier.verify(senderPublicKey, signature);

    if (isValid) {
      const newBlock = new Block(this.lastBlock.hash, transaction);
      this.mine(newBlock.nonce);
      this.chain.push(newBlock);
    }
  }
}

/* We can allow people to securily send coin back and forth by implementing a wallet. Basically a wrapper for a public key and a private key. The public key is for receiving money, the private key is for sending money. RSA algorithm (full encryption algorithm) to generate keys. Can encrypt and decrypt. To encrypt, we use the public key to convert to cypher text - unreadable version of OG value, then use private key to decrypt to OG form. But we want to use the key pair to create a digital signature. With signing, we don't need to encrypt the message, but instead create a hash of it. We then sign the hash with our private key, then the message can be verified later using the public key. If anybody tried to change the message, it would produce a different hash, in which case the verification would fail. */
class Wallet {
  public publicKey: string;
  public privateKey: string;

  constructor(){
    const keypair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {type: 'spki', format: 'pem'},
      privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
    });

    this.privateKey = keypair.privateKey;
    this.publicKey = keypair.publicKey;
  }

  sendMoney(amount: number, payeePublicKey: string) {
    const transaction = new Transaction(amount, this.publicKey, payeePublicKey);

    const sign = crypto.createSign('SHA256');
    sign.update(transaction.toString()).end();

    const signature = sign.sign(this.privateKey);
    Chain.instance.addBlock(transaction, this.publicKey, signature);
  }

}


// Example usage
const satoshi = new Wallet();
const bob = new Wallet();
const alice = new Wallet();

satoshi.sendMoney(50, bob.publicKey);
bob.sendMoney(23, alice.publicKey);
alice.sendMoney(5, bob.publicKey);

console.log(Chain.instance);
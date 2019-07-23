/* global artifacts contract describe before it assert */
/* eslint-disable no-underscore-dangle */
const BN = require('bn.js');

const ValidateSPV = artifacts.require('ValidateSPVDelegate');
const utils = require('./utils');
const constants = require('./constants');


contract('ValidateSPV', () => {
  const zeroBN = new BN('0', 10);

  let instance;
  let parsedTx;
  let parsedHeader;

  before(async () => {
    instance = await ValidateSPV.new();
    parsedTx = await instance.parseTransaction.call(constants.OP_RETURN.TX);
    parsedHeader = await instance.parseHeader
      .call(constants.OP_RETURN.INDEXED_HEADERS[0].HEADER);
  });

  describe('#prove', async () => {
    it('returns true if proof is valid', async () => {
      const res = await instance.prove.call(
        parsedTx._txid,
        parsedHeader._merkleRoot,
        constants.OP_RETURN.PROOF,
        constants.OP_RETURN.PROOF_INDEX
      );
      assert.equal(res, true);
    });

    it('returns false if txid is invalid', async () => {
      const res = await instance.prove.call(
        constants.EMPTY,
        parsedHeader._merkleRoot,
        constants.OP_RETURN.PROOF,
        constants.OP_RETURN.PROOF_INDEX
      );
      assert.equal(res, false);
    });

    it('returns false if first proof hash is not txid', async () => {
      const res = await instance.prove.call(
        parsedTx._txid,
        parsedHeader._merkleRoot,
        constants.OP_RETURN.PROOF_ERR.PROOF_FIRST_HASH,
        constants.OP_RETURN.PROOF_INDEX
      );
      assert.equal(res, false);
    });

    it('returns false if last proof hash is not Merkle root', async () => {
      const res = await instance.prove.call(
        parsedTx._txid,
        parsedHeader._merkleRoot,
        constants.OP_RETURN.PROOF_ERR.PROOF_LAST_HASH,
        constants.OP_RETURN.PROOF_INDEX
      );
      assert.equal(res, false);
    });

    it('returns false if Merkle root is invalid', async () => {
      const res = await instance.prove.call(
        parsedTx._txid,
        parsedTx._txid,
        constants.OP_RETURN.PROOF,
        constants.OP_RETURN.PROOF_INDEX
      );
      assert.equal(res, false);
    });
  });

  describe('#parseTransaction', async () => {
    it('returns the nInputs, inputs, nOutputs, outputs, locktime, and txid', async () => {
      assert.equal(constants.OP_RETURN.N_INPUTS_HEX, parsedTx._nInputs);
      assert.equal(constants.OP_RETURN.INPUTS, parsedTx._inputs);
      assert.equal(constants.OP_RETURN.N_OUTPUTS_HEX, parsedTx._nOutputs);
      assert.equal(constants.OP_RETURN.OUTPUTS, parsedTx._outputs);
      assert.equal(constants.OP_RETURN.LOCKTIME_LE, parsedTx._locktime);
      assert.equal(constants.OP_RETURN.TXID_LE, parsedTx._txid);
    });

    it('returns null if prefix version is invalid', async () => {
      // Incorrect version, 0x01000000 -> 0x03000000
      parsedTx = await instance.parseTransaction.call(constants.OP_RETURN.TX_ERR.TX_VERSION);

      assert.isNull(parsedTx._nInputs);
      assert.isNull(parsedTx._inputs);
      assert.isNull(parsedTx._nOutputs);
      assert.isNull(parsedTx._outputs);
      assert.isNull(parsedTx._locktime);
      assert.equal(constants.EMPTY, parsedTx._txid);
    });

    it('returns null if prefix marker is invalid', async () => {
      // Incorrect marker, 0x00 -> 0x11
      parsedTx = await instance.parseTransaction.call(constants.OP_RETURN.TX_ERR.TX_MARKER);

      assert.isNull(parsedTx._nInputs);
      assert.isNull(parsedTx._inputs);
      assert.isNull(parsedTx._nOutputs);
      assert.isNull(parsedTx._outputs);
      assert.isNull(parsedTx._locktime);
      assert.equal(constants.EMPTY, parsedTx._txid);
    });

    it('returns null if prefix witness flag is invalid', async () => {
      // Incorrect witness flag, 0x01 -> 0x03
      parsedTx = await instance.parseTransaction.call(
        constants.OP_RETURN.TX_ERR.TX_WITNESS_FLAG
      );

      assert.isNull(parsedTx._nInputs);
      assert.isNull(parsedTx._inputs);
      assert.isNull(parsedTx._nOutputs);
      assert.isNull(parsedTx._outputs);
      assert.isNull(parsedTx._locktime);
      assert.equal(constants.EMPTY, parsedTx._txid);
    });

    it('returns null if prefix has no marker and witness flag', async () => {
      // No marker and witness flag
      parsedTx = await instance.parseTransaction.call(
        constants.OP_RETURN.TX_ERR.TX_NO_MARKER_WITNESS_FLAG
      );

      assert.isNull(parsedTx._nInputs);
      assert.isNull(parsedTx._inputs);
      assert.isNull(parsedTx._nOutputs);
      assert.isNull(parsedTx._outputs);
      assert.isNull(parsedTx._locktime);
      assert.equal(constants.EMPTY, parsedTx._txid);
    });

    it('returns null if number of inputs is 0', async () => {
      // No marker and witness flag
      parsedTx = await instance.parseTransaction.call(
        constants.OP_RETURN.TX_ERR.TX_NINPUT_ZERO
      );

      assert.equal('0x00', parsedTx._nInputs);
      assert.isNull(parsedTx._inputs);
      assert.isNull(parsedTx._nOutputs);
      assert.isNull(parsedTx._outputs);
      assert.isNull(parsedTx._locktime);
      assert.equal(constants.EMPTY, parsedTx._txid);
    });

    it('returns null if number of outputs is 0', async () => {
      // No marker and witness flag
      parsedTx = await instance.parseTransaction.call(
        constants.OP_RETURN.TX_ERR.TX_NOUTPUT_ZERO
      );

      assert.equal(constants.OP_RETURN.N_INPUTS_HEX, parsedTx._nInputs);
      assert.ok(parsedTx._inputs);
      assert.equal('0x00', parsedTx._nOutputs);
      assert.isNull(parsedTx._outputs);
      assert.isNull(parsedTx._locktime);
      assert.equal(constants.EMPTY, parsedTx._txid);
    });
  });

  describe('#extractAllInputs', async () => {
    const tx = '0x0100000000010235815cf40015f7b128dc5d86dea441e85721321b10d4d93d76a1bf6070f97fff0000000000feffffff0ad99758ff754b51ef0d72dfa9b9965ae3d510d1e282dfc099b6b3eaea4c30050000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000176a4c1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb7b000000000000001600140be3e4aa1656bb811db32da61d40e9171c8895e20248304502210099525661b53abc1aacc505d8e0919d1ee3210afa4bd40038c46345a9b72d3631022022ee807da4cc4a743c3243063d30174c6752b3e57d02f92d7a083604f73c3e20832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc2024830450221008dba80574b4e1852cd1312c3fe2d6d4ad2958895b9bbad82f45820de02b32a4902201c2b807596c3aa603d659a1be4eb09e5d7ab56836722bfe1cdb649de7164ab9f012102ef21caa25eca974d3bdd73c034d6943cbf145a700d493adaa6f496bd87c5b33be26ab25b';
    const nInputs = '0x02';
    const inputs = '0x35815cf40015f7b128dc5d86dea441e85721321b10d4d93d76a1bf6070f97fff0000000000feffffff0ad99758ff754b51ef0d72dfa9b9965ae3d510d1e282dfc099b6b3eaea4c30050000000000feffffff';

    it('returns the number of inputs and inputs string', async () => {
      const extractedInputs = await instance.extractAllInputs.call(tx);

      assert.equal(nInputs, extractedInputs._nInputs);
      assert.equal(inputs, extractedInputs._inputs);
    });
  });

  describe('#extractAllOutputs', async () => {
    const tx = '0x0100000000010235815cf40015f7b128dc5d86dea441e85721321b10d4d93d76a1bf6070f97fff0000000000feffffff0ad99758ff754b51ef0d72dfa9b9965ae3d510d1e282dfc099b6b3eaea4c30050000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000176a4c1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb7b000000000000001600140be3e4aa1656bb811db32da61d40e9171c8895e20248304502210099525661b53abc1aacc505d8e0919d1ee3210afa4bd40038c46345a9b72d3631022022ee807da4cc4a743c3243063d30174c6752b3e57d02f92d7a083604f73c3e20832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc2024830450221008dba80574b4e1852cd1312c3fe2d6d4ad2958895b9bbad82f45820de02b32a4902201c2b807596c3aa603d659a1be4eb09e5d7ab56836722bfe1cdb649de7164ab9f012102ef21caa25eca974d3bdd73c034d6943cbf145a700d493adaa6f496bd87c5b33be26ab25b';
    const nOutputs = '0x03';
    const outputs = '0xe8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000176a4c1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb7b000000000000001600140be3e4aa1656bb811db32da61d40e9171c8895e2';

    it('returns the number of outputs and outputs string', async () => {
      const extractedOutputs = await instance.extractAllOutputs.call(tx);
      assert.equal(nOutputs, extractedOutputs._nOutputs);
      assert.equal(outputs, extractedOutputs._outputs);
    });
  });

  describe('#transactionHash', async () => {
    it('returns the transaction hash', async () => {
      const res = await instance.calculateTxId.call(
        constants.OP_RETURN.VERSION,
        constants.OP_RETURN.N_INPUTS_HEX,
        constants.OP_RETURN.INPUTS,
        constants.OP_RETURN.N_OUTPUTS_HEX,
        constants.OP_RETURN.OUTPUTS,
        constants.OP_RETURN.LOCKTIME_LE
      );
      assert.equal(res, constants.OP_RETURN.TXID_LE);
    });
  });

  describe('#validatePrefix', async () => {
    let tx;
    let prefix;

    it('returns true for a valid prefix with version 01', async () => {
      tx = '0x0100000000010235815cf40015f7b128dc5d86dea441e85721321b10d4d93d76a1bf6070f97fff0000000000feffffff0ad99758ff754b51ef0d72dfa9b9965ae3d510d1e282dfc099b6b3eaea4c30050000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000176a4c1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb7b000000000000001600140be3e4aa1656bb811db32da61d40e9171c8895e20248304502210099525661b53abc1aacc505d8e0919d1ee3210afa4bd40038c46345a9b72d3631022022ee807da4cc4a743c3243063d30174c6752b3e57d02f92d7a083604f73c3e20832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc2024830450221008dba80574b4e1852cd1312c3fe2d6d4ad2958895b9bbad82f45820de02b32a4902201c2b807596c3aa603d659a1be4eb09e5d7ab56836722bfe1cdb649de7164ab9f012102ef21caa25eca974d3bdd73c034d6943cbf145a700d493adaa6f496bd87c5b33be26ab25b';
      let res = await instance.validatePrefix.call(tx);
      assert.equal(res, true);

      prefix = '0x010000000001';
      res = await instance.validatePrefix.call(prefix);
      assert.equal(res, true);
    });

    it('returns true for a valid prefix with version 02', async () => {
      tx = '0x0200000000010235815cf40015f7b128dc5d86dea441e85721321b10d4d93d76a1bf6070f97fff0000000000feffffff0ad99758ff754b51ef0d72dfa9b9965ae3d510d1e282dfc099b6b3eaea4c30050000000000feffffff03e8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c0000000000000000176a4c1423d81b160cb51f763e7bf9b373a34f5ddb75fcbb7b000000000000001600140be3e4aa1656bb811db32da61d40e9171c8895e20248304502210099525661b53abc1aacc505d8e0919d1ee3210afa4bd40038c46345a9b72d3631022022ee807da4cc4a743c3243063d30174c6752b3e57d02f92d7a083604f73c3e20832102a004b949e4769ed341064829137b18992be884da5932c755e48f9465c1069dc2024830450221008dba80574b4e1852cd1312c3fe2d6d4ad2958895b9bbad82f45820de02b32a4902201c2b807596c3aa603d659a1be4eb09e5d7ab56836722bfe1cdb649de7164ab9f012102ef21caa25eca974d3bdd73c034d6943cbf145a700d493adaa6f496bd87c5b33be26ab25b';
      let res = await instance.validatePrefix.call(tx);
      assert.equal(res, true);

      prefix = '0x020000000001';
      res = await instance.validatePrefix.call(prefix);
      assert.equal(res, true);
    });

    it('returns false if the version is invalid', async () => {
      prefix = '0x030000000001';
      const res = await instance.validatePrefix.call(prefix);
      assert.equal(res, false);
    });

    it('returns false if the segwit flag is invalid', async () => {
      prefix = '0x010000000002';
      const res = await instance.validatePrefix.call(prefix);
      assert.equal(res, false);
    });

    it('returns false if input string is less than 6 bytes', async () => {
      prefix = '0x01000000';
      const res = await instance.validatePrefix.call(prefix);
      assert.equal(res, false);
    });
  });

  describe('#parseInput', async () => {
    const input = '0x7bb2b8f32b9ebf13af2b0a2f9dc03797c7b77ccddcac75d1216389abfa7ab3750000000000ffffffff';
    const sequence = '4294967295';
    const index = zeroBN;

    it('returns the tx input sequence and outpoint', async () => {
      const hashBE = '0x75b37afaab896321d175acdccd7cb7c79737c09d2f0a2baf13bf9e2bf3b8b27b';

      const txIn = await instance.parseInput.call(input);

      assert(txIn._sequence.eq(new BN(sequence, 10)));
      assert.equal(txIn._hash, hashBE);
      assert(txIn._index.eq(index));
    });

    it('bubble up errors if the input does not have a 00 scriptSig', async () => {
      // Removed 00 scriptSig from input to create error
      const badInput = '0x7bb2b8f32b9ebf13af2b0a2f9dc03797c7b77ccddcac75d1216389abfa7ab37500000000ffffffff';
      const invalidTxIn = await instance.parseInput.call(badInput);
      assert(zeroBN.eq(invalidTxIn._sequence));
      assert.equal(constants.EMPTY, invalidTxIn._hash);
      assert(zeroBN.eq(invalidTxIn._index));
    });

    it('bubble up errors if the input length is incorrect', async () => {
      // Added extra 0xff byte at the end to create and invalid input length of 42 bytes
      const badInput = '0x7bb2b8f32b9ebf13af2b0a2f9dc03797c7b77ccddcac75d1216389abfa7ab3750000000000ffffffffff';
      const invalidTxIn = await instance.parseInput.call(badInput);
      assert(zeroBN.eq(invalidTxIn._sequence));
      assert.equal(constants.EMPTY, invalidTxIn._hash);
      assert(zeroBN.eq(invalidTxIn._index));
    });
  });

  describe('#parseOutput', async () => {
    let output;
    let value;
    let payload;

    it('returns the tx output value, output type, and payload for an OP_RETURN output',
      async () => {
        const opReturnTxOut = await instance.parseOutput.call(
          constants.OP_RETURN.INDEXED_OUTPUTS[1].OUTPUT
        );

        assert.equal(constants.OP_RETURN.INDEXED_OUTPUTS[1].VALUE, opReturnTxOut._value);
        assert.equal(utils.OUTPUT_TYPES.OP_RETURN, opReturnTxOut._outputType);
        assert.equal(constants.OP_RETURN.INDEXED_OUTPUTS[1].PAYLOAD, opReturnTxOut._payload);
      });

    it('returns the tx output value, output type, and payload for an WPKH output', async () => {
      output = '0xe8cd9a3b000000001600147849e6bf5e4b1ba7235572d1b0cbc094f0213e6c';
      value = 1000001000;
      payload = '0x7849e6bf5e4b1ba7235572d1b0cbc094f0213e6c';

      const wpkhOutput = await instance.parseOutput.call(output);

      assert.equal(wpkhOutput._value, value);
      assert.equal(wpkhOutput._outputType, utils.OUTPUT_TYPES.WPKH);
      assert.equal(wpkhOutput._payload, payload);
    });

    it('returns the tx output value, output type, and payload for an WSH output', async () => {
      output = '0x40420f0000000000220020aedad4518f56379ef6f1f52f2e0fed64608006b3ccaff2253d847ddc90c91922';
      value = 1000000;
      payload = '0xaedad4518f56379ef6f1f52f2e0fed64608006b3ccaff2253d847ddc90c91922';

      const wshOutput = await instance.parseOutput.call(output);

      assert.equal(wshOutput._value, value);
      assert.equal(wshOutput._outputType, utils.OUTPUT_TYPES.WSH);
      assert.equal(wshOutput._payload, payload);
    });

    it('bubble up errors if the tx output type is not identifiable', async () => {
      // Changes 0x6a (OP_RETURN) to 0x7a to create error
      output = '0x0000000000000000167a14edb1b5c2f39af0fec151732585b1049b07895211';

      const invalidOutput = await instance.parseOutput.call(output);

      assert(zeroBN.eq(invalidOutput._value));
      assert(zeroBN.eq(invalidOutput._outputType));
      assert.isNull(invalidOutput._payload);
    });
  });

  describe('#parseHeader', async () => {
    it('returns the header digest, version, prevHash, merkleRoot, timestamp, target, and nonce',
      async () => {
        const validHeader = await instance.parseHeader
          .call(constants.OP_RETURN.INDEXED_HEADERS[0].HEADER);

        assert.equal(constants.OP_RETURN.INDEXED_HEADERS[0].DIGEST_BE, validHeader._digest);
        assert.equal(constants.OP_RETURN.INDEXED_HEADERS[0].VERSION, validHeader._version);
        assert.equal(constants.OP_RETURN.INDEXED_HEADERS[0].PREV_HASH_LE, validHeader._prevHash);
        assert.equal(
          constants.OP_RETURN.INDEXED_HEADERS[0].MERKLE_ROOT_LE,
          validHeader._merkleRoot
        );
        assert.equal(constants.OP_RETURN.INDEXED_HEADERS[0].TIMESTAMP, validHeader._timestamp);
        assert.equal(constants.OP_RETURN.INDEXED_HEADERS[0].TARGET, validHeader._target);
        assert.equal(constants.OP_RETURN.INDEXED_HEADERS[0].NONCE, validHeader._nonce);
      });

    it('bubble up errors if input header is not 80 bytes', async () => {
      // Removed a byte from the header version to create error
      const invalidHeader = await instance.parseHeader.call(
        constants.HEADER_ERR.HEADER_0_LEN
      );

      assert.equal(constants.EMPTY, invalidHeader._digest);
      assert(zeroBN.eq(invalidHeader._version));
      assert.equal(constants.EMPTY, invalidHeader._prevHash);
      assert.equal(constants.EMPTY, invalidHeader._merkleRoot);
      assert(zeroBN.eq(invalidHeader._timestamp));
      assert(zeroBN.eq(invalidHeader._target));
      assert(zeroBN.eq(invalidHeader._nonce));
    });
  });

  describe('#validateHeaderChain', async () => {
    it('returns true if header chain is valid', async () => {
      const res = await instance.validateHeaderChain.call(constants.OP_RETURN.HEADER_CHAIN);
      assert(res.eq(new BN('49134394618239', 10)));
    });

    it('returns 1 if header chain is not divisible by 80', async () => {
      const res = await instance.validateHeaderChain
        .call(constants.HEADER_ERR.HEADER_CHAIN_INVALID_LEN);
      assert(res.eq(new BN('1', 10)));
    });

    it('returns 2 if header chain prevHash is invalid', async () => {
      const res = await instance.validateHeaderChain
        .call(constants.HEADER_ERR.HEADER_CHAIN_INVALID_PREVHASH);
      assert(res.eq(new BN('2', 10)));
    });

    it('returns 3 if a header does not meet its target', async () => {
      const res = await instance.validateHeaderChain
        .call(constants.HEADER_ERR.HEADER_CHAIN_LOW_WORK);
      assert(res.eq(new BN('3', 10)));
    });
  });

  describe('#validateHeaderPrevHash', async () => {
    it('returns true if header prevHash is valid', async () => {
      const res = await instance.validateHeaderPrevHash.call(
        constants.OP_RETURN.INDEXED_HEADERS[1].HEADER,
        constants.OP_RETURN.INDEXED_HEADERS[0].DIGEST_LE
      );
      assert.equal(res, true);
    });

    it('returns false if header prevHash is invalid', async () => {
      const res = await instance.validateHeaderPrevHash.call(
        constants.OP_RETURN.INDEXED_HEADERS[1].HEADER,
        constants.OP_RETURN.INDEXED_HEADERS[1].DIGEST_LE
      );
      assert.equal(res, false);
    });
  });
});

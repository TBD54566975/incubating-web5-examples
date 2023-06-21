import {Dwn, ProtocolsConfigure, RecordsWrite, RecordsQuery} from '@tbd54566975/dwn-sdk-js'
import {ALICE_DID, ALICE_SIG, BOB_DID, BOB_SIG} from './identity.js'
import {protocolDefinition} from '../tbdex-protocol.js'

const dwn = await Dwn.create()

const configure = async (definition, did, sig) => {
  const intent = await ProtocolsConfigure.create({ definition, authorizationSignatureInput: sig })
  const { status } = await dwn.processMessage(did, intent.message)
  console.log('Configure status', status)
}

const write = async (did, sig, protocol) => {
  const data = Buffer.from(JSON.stringify({hello: 'world'}), 'utf-8');
  const intent = await RecordsWrite.create({
    data,
    dataFormat: 'application/json',
    authorizationSignatureInput: sig,
    ...protocol
  });
  const reply = await dwn.processMessage(did, intent.message, data)
  console.log('RecordsWrite reply', reply)
  return intent.message.recordId
}

const protocol = {
  protocol: protocolDefinition.protocol,
  protocolPath: 'RFQ',
  schema: 'https://tbd.website/protocols/tbdex/RequestForQuote',
  recipient: BOB_DID
}

// alice
await configure(protocolDefinition, ALICE_DID, ALICE_SIG)
await write(ALICE_DID, ALICE_SIG, protocol)

// bob
await configure(protocolDefinition, BOB_DID, BOB_SIG)
await write(BOB_DID, ALICE_SIG, protocol)

// to showcase alice can't just write any old record to bob,
// the record must be part of the protocol
await write(BOB_DID, ALICE_SIG)

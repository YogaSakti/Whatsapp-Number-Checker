const { Client } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const moment = require('moment')

let sessionCfg = fs.existsSync('./session.json') ? require('./session.json') : ''

const client = new Client({
    puppeteer: {
        headless: true
    },
    session: sessionCfg
})

client.initialize()

client.on('qr', qr => qrcode.generate(qr, {
    small: true
}))

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED')
    sessionCfg = session
    fs.writeFileSync('./session.json', JSON.stringify(session))
})

client.on('auth_failure', () => console.error('AUTHENTICATION FAILURE'))

client.on('ready', () => console.log('READY'))

// Command Handler
client.on('message', async msg => {
    // console.log('MESSAGE RECEIVED')
    let { mediaKey, id, ack, hasMedia, body, type, timestamp, from, to, author, isForwarded, broadcast, fromMe, hasQuotedMsg, location, mentionedIds} = msg
    const caption = type == 'image' ? body : ''
    const prefix = '$'
    body = (type === 'chat' && body.startsWith(prefix)) ? body : caption.startsWith(prefix) ? caption : ''
    const command = body.slice(1).trim().split(/s+|\n/).shift().toLowerCase()
    const isCmd = body.startsWith(prefix)
    const args = body.split('\n').slice(1)
    if (isCmd) console.log('[EXEC]', moment(timestamp * 1000).format('DD/MM/YY HH:mm:ss'), `${command} [${args.length}]`, 'from', from.replace('@c.us', ''))

    switch (command) {
        case 'cek':
        case 'check': {
            const fileName = moment(timestamp * 1000).format('HH-mm-ss') + '.txt'
            if (args.length >= 1500) return client.sendMessage(from, 'gileee, bro limit 1K per check yee')
            await Promise.all(
                    args.map((number, i) => {
                        return setTimeout(async () => {
                            const contactId = number + '@c.us'
                            const result = await client.isRegisteredUser(contactId)
                            console.log(`[${i}] Checking Number:`, number, 'Result:', result)
                            fs.appendFileSync('result/' + fileName, `${number}: ${result}\n`)
                        }, i * 100)
                    }))
                .then(() => client.sendMessage(from, `Memeriksa ${args.length} nomor...\nFile Tersimpan: ${fileName}`))
            break
        }
    }
})
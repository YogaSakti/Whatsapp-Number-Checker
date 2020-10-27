const chalk = require("chalk");
const express = require("express");
const bodyParser = require('body-parser')
const { WAConnection, ReconnectMode } = require("@adiwajshing/baileys")
const fs = require("fs");

class App {
  app;

  constructor() {
    this.app = express();
    this.app.set("host", "0.0.0.0");
    this.app.set("port", process.env.PORT || 4000);
    this.app.set('view engine', 'ejs');
    this.app.use(express.static('public'));
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({extended: true}))

    this.client = new WAConnection()
    this.client.autoReconnect = ReconnectMode.onAllErrors
    this.client.connectOptions.maxRetries = Infinity
    this.client.connectOptions.timeoutMs = 30 * 1000
  }

  async listen() {
    const authFile = '.auth_info.json'
    if (fs.existsSync(authFile)) {
      try {
        this.client.loadAuthInfo(authFile)
        await this.client.connect()
      } catch (err) {
        console.error(err)
      }
    } else {
      await this.client.connect()
      const authInfo = this.client.base64EncodedAuthInfo() // get all the auth info we need to restore this session
      fs.writeFileSync(authFile, JSON.stringify(authInfo, null, '\t')) // save this info to a file
    }

    console.log(`${chalk.green("✓")} Whatsapp Connection is Open`)
    console.log(`${chalk.green("✓")} Ready - using account of: ${this.client.user.name}`)

    this.app.get("/", (req, res) => {
      res.render('index.ejs')
    });

    this.app.post("/", async (req, res) => {
      const numberRaw = req.body.number
      const numberlist = numberRaw.replace(/\r/g, " ").replace(/\//g, "").replace(/\n/g, "").split(" ")
      console.log(`[${chalk.yellow('Work')}] Checking ${numberlist.length} number...`)

      if (numberlist.length >= 201) {
        return res.render("index.ejs", {
          error: 'asu nomernya kebanyakan, maksimal 200 cok'
        })
      } else if (numberlist.length <= 1 && numberlist[0] == '') {
        return res.render("index.ejs", {
          error: 'Cok gada nomernya, masukin dulu lah'
        })
      }

      let validNumber = []
      await Promise.all(
        numberlist.map((number, i) => new Promise((resolve, reject) => {
          if (!isNaN(number) || number == '') {
            setTimeout(async () => {
              const contactId = number.includes('@s.whatsapp.net') ? number.trim() : number.trim() + '@s.whatsapp.net'
              const result = await this.client.isOnWhatsApp(contactId)
              result ? console.log(`[${chalk.green(i)}] Number:`, number, '| Result:', result) : console.log(`[${chalk.red(i)}] Number:`, number, '| Result:', result)
              validNumber.push({number, value: result.toString().toUpperCase()})
              resolve()
            }, i * 100)
          } else {
            return res.render("index.ejs", {
              error: 'nomernya ada yang salah tu'
            })
          }
        })))
      res.render("index.ejs", {result: validNumber})
    })

    this.app.listen(this.app.get("port"), () => {
      console.log(`${chalk.green("✓")} server started at http://localhost:${this.app.get("port")}`);
    });
  }
}

const server = new App();
server.listen();
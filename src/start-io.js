// The socket.io server and polyglot clients. Called by scripts/_init.js
const { spawn } = require('child_process')
const _ = require('lomath')
const path = require('path')
const polyIO = require('poly-socketio')
const log = require(path.join(__dirname, 'log'))
process.env.IOPORT = process.env.IOPORT || 6466

// import other languages via child_process
var ioClientCmds = {
    python3: {
      // install_dependency: "python3 -m pip install socketIO-client",
      client: path.join(__dirname, 'client.py')
    }
  }

const CLIENT_COUNT = 2

/**
 * Helper: called from within ioServer after its setup.
 * Start all polyglot ioClient processes using spawn. Kill them on error to prevent runaway processes, i.e. run all the io_import.<language> processes. The io_import.<language> im turn runs all the io clients of that language.
 */
/* istanbul ignore next */
function ioClient() {
  // the child processes,kill all on death
  var children = []

  /* istanbul ignore next */
  process.on('exit', () => {
    children.forEach((child) => {
      child.kill()
    })
    log.info('Exit: killed ioClient.js children')
  })

  _.each(ioClientCmds, (cmds, lang) => {
    // spawn ioclients for other lang
    log.info(`Starting socketIO client for ${lang} at ${process.env.IOPORT}`)
    var cp = spawn(lang, [cmds['client']], { stdio: [process.stdin, process.stdout, 'pipe'] })
    children.push(cp)

    /* istanbul ignore next */
    cp.stderr.on('data', (data) => {
      log.error(`${data.toString('utf8')}`)
      cp.kill('SIGTERM') // kill if err to prevent runover process
    })
  })
}

/**
 * The main method to start the io server then clients.
 * Calls server and client methods above.
 */
/* istanbul ignore next */
function ioStart() {
  polyIO.server({
      port: process.env.IOPORT,
      clientCount: CLIENT_COUNT,
      debug: process.env['npm_config_debug']
    })
    .then(ioClient)
  return global.ioPromise
}

/* istanbul ignore next */
const cleanExit = () => { process.exit() }
process.on('SIGINT', cleanExit) // catch ctrl-c
process.on('SIGTERM', cleanExit) // catch kill
process.on('uncaughtException', log.error)

// export for use by hubot
module.exports = ioStart

// if this file is run directly by `node server.js`
/* istanbul ignore next */
if (require.main === module) {
  ioStart()
}
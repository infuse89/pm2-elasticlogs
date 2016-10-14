'use strict';

const pm2 = require('pm2');
const pmx = require('pmx');
const packageJSON =  require('./package');
const conf = pmx.initModule();
const elasticLibModule = require('./libs/elasticsearch');
const elasticLib = new elasticLibModule(conf.elasticsearch_host, conf.elasticsearch_index);
/**
 * Change default host to elasticsearch : pm2 set pm2-elasticlogs:elasticsearch_host 'http://localhost:9200'
 *
 *   Start module in development mode
 *          $ pm2 install .
 */

pm2.Client.launchBus(function(err, bus) {
    if(err)
        return console.error(err);
    bus.on('log:*', function(type, packet) {
        if ((conf.app_name != 'all' && conf.app_name && conf.app_name != packet.process.name) || packet.process.name === packageJSON.name) return false;

        if (typeof(packet.data) == 'string')
            packet.data = packet.data.replace(/(\r\n|\n|\r)/gm,'');
        elasticLib.create({
            message : packet.data,
            application : packet.process.name,
            process_id : packet.process.pm_id,
        }).catch((e) => {console.error(e)});
    });
});

const utils = require("./utils");

module.exports = async function (RED) {
    var ui = RED.require("node-red-dashboard")(RED);
    const teknoir_config = await utils.config();
    const grafana = utils.grafana(teknoir_config.GRAFANA_HOST);
    const renderer = utils.renderer();

    function getData(config, node) {
        if (!config.selectedDashboardUID || !config.selectedPanelID) {
            const msg = "Must choose dashboard/panel";
            node.error(msg);
            node.status({ fill: "red", shape: "dot", text: msg });
            return Promise.reject(new Error(`invalid configuration: ${msg}`));
        }
        else {
            return grafana
                .getPanelSoloUrl(config.selectedDashboardUID, config.selectedPanelID, teknoir_config.DOMAIN)
                .then(data => {
                    node.status({ fill: "green", shape: "dot", text: "deployed" });
                    return data.fullUrl ? renderer.iframe(node.id, data.fullUrl, config.width, config.height) : renderer.error(node.id, "couldn't find panel")
                })
                .catch(err => {
                    const msg = "Can't find selected panel";
                    node.error(msg);
                    node.status({ fill: "red", shape: "dot", text: msg });
                    console.log(err)
                    throw err
                });
        }
    }

    function Init(config) {
        try {
            RED.nodes.createNode(this, config);
            var node = this;
            getData(config, node).then(html => {
                console.log(`deploying node`, node)
                const done = ui.addWidget({
                    node: node,
                    order: config.order,
                    format: html,
                    templateScope: "local",
                    group: config.group,
                    emitOnlyNewValues: false,
                    forwardInputMessages: false,
                    storeFrontEndInputAsState: false,
                    convertBack: function (value) {
                        return value;
                    },
                    beforeEmit: function (msg, value) {
                        return { msg: msg };
                    },
                    beforeSend: function (msg, orig) {
                        if (orig) { return orig.msg; }
                    },
                    initController: function ($scope, events) {
                    }
                });
                node.on("close", done);
            });
        }
        catch (e) {
            console.log(e);
        }
    }
    RED.nodes.registerType('ui-grafana-embed-panel', Init);


    RED.httpAdmin.get("/grafana/dashboards", function (req, res) {
        grafana.getAllDashboards().then((x) => res.json(x));
    });

    RED.httpAdmin.get("/grafana/dashboards/:uid", function (req, res) {
        var dashboardUID = req.params.uid;
        grafana.getDashboard(dashboardUID).then((x) => res.json(x));
    });

    RED.httpAdmin.get("/grafana/dashboards/:uid/panels/:pid/solo-url", function (req, res) {
        var dashboardUID = req.params.uid;
        var panelId = req.params.uid;
        grafana.getPanelSoloUrl(dashboardUID, panelId, teknoir_config.DOMAIN).then((x) => res.json(x));
    });
};